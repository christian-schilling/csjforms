(function(){

var extend = function(dest,src) {
    for(var i in src) {
         dest[i] = src[i];
    }
    return dest;
};

var ucfirst = function(str) {
    var firstLetter = str.substr(0, 1);
    return firstLetter.toUpperCase() + str.substr(1);
}
var to_verbose = function(opts) {
    if(opts.verbose) return opts.verbose;
    else return ucfirst(opts.name);
}
var to_plural = function(opts) {
    if(opts.plural) return opts.plural;
    else return to_verbose(opts)+'s';
}


csjforms = {
    widgets:{
        text: function(options) {
            return extend({
                template : '<label><%= label %></label><input type="text" name="<%= name %>">',
                create : function(parentdef,jqs) {
                    jqs.append(template(this.template,{name:parentdef.name,label:to_verbose(parentdef)}));
                    var jqs = jqs.children('[name='+this.name+']');
                    return jqs;
                },
                tojson : function(jqs) { return this.validate(jqs.val());},
                fromjson : function(jqs,jsonobj) { jqs.val(this.validate(jsonobj));},
                validate : function(jsonobj) { return jsonobj; },
            },options);
        },
        textarea: function(options) {
            return extend(extend(csjforms.widgets.text(),{
                template : '<label><%= label %></label><textarea rows=20 cols=80 name="<%= name %>"></textarea>',
            }),options);
        },
        bool: function(options) {
            return extend(extend(csjforms.widgets.text(),{
                template : '<label><%= label %></label><input type="checkbox" name="<%= name %>" value="<%= name %>">',
                tojson : function(jqs){ return jqs.filter(':checked').size() ? true:false; },
                fromjson : function(jqs,jsonobj) { jqs.val(jsonobj?[jqs.attr('name')]:[]); },
            }),options);
        },
    },
    fields:{
        text: function(options) {
            return extend({
                widget : csjforms.widgets.text(),
                tojson : function(jqs){
                    jqs.children('p.error').remove();
                    try{
                        return this.validate(this.widget.tojson(jqs.children('[name='+this.name+']')));
                    }catch(e){
                        jqs.append('<p class="error">'+e.message+'</p>');
                        throw e;
                    }
                },
                fromjson : function(jqs,jsonobj){
                    this.widget.fromjson(jqs.children('[name='+this.name+']'),this.validate(jsonobj));
                },
                create : function(parentdef,jqs) {
                    jqs.append('<div class="csjformfield" title="'+this.name+'"></div>');
                    var jqs = jqs.children('.csjformfield:last');
                    this.widget.create(this,jqs);
                    return jqs;
                },
                validate : csjforms.validators.notblank(),
            },options);
        },
        bool: function(options) {
            return extend(extend(csjforms.fields.text(),{
                widget : csjforms.widgets.bool(),
                validate: function(jsonobj) { return jsonobj;},
            }),options);
        },
        integer: function(options) {
            return extend(extend(csjforms.fields.text(),{
                validate:csjforms.validators.integer(),
                texttojson:csjforms.fields.text().tojson,
                tojson: function(jqs) {
                    return this.validate(parseInt(this.texttojson(jqs),10));
                },
            }),options);
        },
    },
    validators: {
        notblank: function() {
            return function(jsonobj){
                if(!jsonobj) throw {name:'ValidationError',message:'must not be emtpy'};
                else return jsonobj;
            };
        },
        regex: function(re) {
            return function(jsonobj) {
                if(!re.test(jsonobj)) throw {
                    name:'ValidationError',
                    message:'invalid value',
                };
                else return jsonobj;
            };
        },
        integer: function() {
            return function(jsonobj) {
                try{
                    return csjforms.validators.regex(/^\d+$/)(jsonobj);
                }catch(e){
                    throw extend(e,{message:'not an integer'});
                }
            };
        },
    },
    fieldset: function(options) {
        return extend({
            template:'<fieldset class="<%= name %>"><legend><%= label %></legend></fieldset>',
            delbutton:'<input type="submit" name="del_<%= name %>" value="-" class="delbutton">',
            fields : [],
            create : function(parentdef,jqs) {
                jqs.append(template(this.template,{name:this.name,label:to_verbose(this)}));
                var jqs = jqs.children('fieldset:last');
                if(parentdef) {
                    jqs.append(template(this.delbutton,{name:this.name}));
                    jqs.children('input.delbutton').click(function(){$(this).parent().remove();return false;});
                }
                for(var i in this.fields) {
                    this.fields[i].create(this,jqs);
                }
                return jqs;
            },
            tojson : function(jqs) {
                var jsonobj = {};
                var errors = [];
                var field;
                for(var i in this.fields) {
                    field = this.fields[i];
                    try{ jsonobj[field.name] = field.tojson(jqs.children('[title='+field.name+']'));}
                    catch(e) {errors.push(e);}
                }
                if(errors.length) throw {name:'ValidationError',errors:errors};
                return this.validate(jsonobj);
            },
            fromjson : function(jqs,jsonobj){
                var jsonobj = this.validate(jsonobj);
                var field;
                for(var i in this.fields) {
                    field = this.fields[i];
                    field.fromjson(jqs.children('[title='+field.name+']'),jsonobj[field.name]);
                }
            },
            validate : function(jsonobj) { return jsonobj; },
        },options);
    },
    inline: function(options) {
        return extend({
            template :'<div class="csjformset" title="<%= name %>">'
                     +'    <h1><%= label %></h1><div class="container"></div>'
                     +'    <input type="submit" name="add_<%= name %>" value="+" class="addbutton">'
                     +'</div>',
            create : function(parentdef,jqs) {
                jqs.append(template(this.template,{name:this.name,label:to_plural(this)}));
                var jqs = jqs.children('.csjformset[title='+this.name+']');
                var that = this;
                jqs.children('input.addbutton[name=add_'+this.name+']').click(function(){
                    that.append_fieldset($(this).parent());
                    return false;
                });
                return jqs;
            },
            append_fieldset : function(jqs) {
                return this.fieldset.create(this,jqs.children('.container'));
            },
            tojson : function(jqs) {
                var jsonobj = [];
                var errors = [];
                var that = this;
                jqs.children('.container').children('fieldset').each(function(){
                    try{jsonobj.push(that.fieldset.tojson($(this)));}
                    catch(e){errors.push(e);}
                });
                if(errors.length) throw {name:'ValidationError',errors:errors};
                return this.validate(jsonobj);
            },
            fromjson : function(jqs,jsonobj){
                var jsonobj = this.validate(jsonobj);
                for(var i in jsonobj){
                    this.fieldset.fromjson(this.append_fieldset(jqs),jsonobj[i]);
                }
            },
            validate : function(jsonobj) { return jsonobj; },
        },options);
    },
};

})();

