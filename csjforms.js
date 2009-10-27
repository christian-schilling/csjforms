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
                create : function(jqs,parentdef) {
                    jqs.append(template(this.template,{name:parentdef.name,label:to_verbose(parentdef)}));
                    return jqs.children('[name='+parentdef.name+']');
                },
                tojson : function(jqs) { return jqs.val();},
                fromjson : function(jqs,jsonobj) { jqs.val(jsonobj);},
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
        hidden: function(options) {
            return extend(extend(csjforms.widgets.text(),{
                template : '<input type="hidden" name="<%= name %>">',
                supercreate : csjforms.widgets.text().create,
                create : function(jqs,parentdef){
                    var r = this.supercreate(jqs,parentdef);
                    r.parent().hide();
                    return r;
                },
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
                        var jsonobj = this.widget.tojson(jqs.children('[name='+this.name+']'))
                        for(var i in this.validate){this.validate[i](jsonobj);}
                        return jsonobj;
                    }catch(e){
                        jqs.append('<p class="error">'+e.message+'</p>');
                        throw e;
                    }
                },
                fromjson : function(jqs,jsonobj){
                    for(var i in this.validate){this.validate[i](jsonobj);}
                    this.widget.fromjson(jqs.children('[name='+this.name+']'),jsonobj);
                },
                create : function(jqs,parentdef) {
                    jqs.append('<div class="csjformfield" title="'+this.name+'"></div>');
                    var jqs = jqs.children('.csjformfield:last');
                    this.widget.create(jqs,this);
                    return jqs;
                },
                validate : [csjforms.validators.notblank(),],
                validate_doc : function(jsonobj) {
                    for(var i in this.validate){this.validate[i](jsonobj);}
                },
            },options);
        },
        bool: function(options) {
            return extend(extend(csjforms.fields.text(),{
                widget : csjforms.widgets.bool(),
                validate: [],
            }),options);
        },
        integer: function(options) {
            return extend(extend(csjforms.fields.text(),{
                validate:[csjforms.validators.notblank(),csjforms.validators.integer(),],
                texttojson:csjforms.fields.text().tojson,
                tojson: function(jqs) {
                    var jsonobj = parseInt(this.texttojson(jqs),10);
                    for(var i in this.validate){this.validate[i](jsonobj);}
                    return jsonobj;
                },
            }),options);
        },
    },
    validators: {
        notblank: function() {
            return function(jsonobj){
                if(!jsonobj) throw {name:'ValidationError',message:'must not be emtpy'};
            };
        },
        regex: function(re) {
            return function(jsonobj) {
                if(!jsonobj) {return;}
                if(!re.test(jsonobj)) throw { name:'ValidationError', message:'invalid value', };
            };
        },
        integer: function() {
            return function(jsonobj) {
                if(!jsonobj) {return;}
                try{
                    csjforms.validators.regex(/^\d+$/)(jsonobj);
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
            create : function(jqs,parentdef) {
                jqs.append(template(this.template,{name:this.name,label:to_verbose(this)}));
                var jqs = jqs.children('fieldset:last');
                if(parentdef) {
                    jqs.append(template(this.delbutton,{name:this.name}));
                    jqs.children('input.delbutton').click(function(){$(this).parent().remove();return false;});
                }
                for(var i in this.fields) {
                    this.fields[i].create(jqs,this);
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
                jsonobj._id = jsonobj._id || undefined;
                jsonobj._rev = jsonobj._rev || undefined;
                for(var i in this.validate){this.validate[i](jsonobj);}
                return jsonobj;
            },
            fromjson : function(jqs,jsonobj){
                for(var i in this.validate){this.validate[i](jsonobj);}
                var field;
                for(var i in this.fields) {
                    field = this.fields[i];
                    field.fromjson(jqs.children('[title='+field.name+']'),jsonobj[field.name]);
                }
            },
            validate : [],
            validate_doc : function(jsonobj) {
                for(var i in this.validate){this.validate[i](jsonobj);}
                var field;
                for(var i in this.fields) {
                    field = this.fields[i];
                    field.validate_doc(jsonobj[field.name]);
                }
            },
        },options);
    },
    inline: function(options) {
        return extend({
            template :'<div class="csjformset" title="<%= name %>">'
                     +'    <h1><%= label %></h1><div class="container"></div>'
                     +'    <input type="submit" name="add_<%= name %>" value="+" class="addbutton">'
                     +'</div>',
            create : function(jqs,parentdef) {
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
                return this.fieldset.create(jqs.children('.container'),this);
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
                for(var i in this.validate){this.validate[i](jsonobj);}
                return jsonobj;
            },
            fromjson : function(jqs,jsonobj){
                for(var i in this.validate){this.validate[i](jsonobj);}
                for(var i in jsonobj){
                    this.fieldset.fromjson(this.append_fieldset(jqs),jsonobj[i]);
                }
            },
            validate : [],
            validate_doc : function(jsonobj) {
                for(var i in this.validate){this.validate[i](jsonobj);}
                for(var i in jsonobj){
                    this.fieldset.validate_doc(jsonobj[i]);
                }
            },
        },options);
    },
};

})();

