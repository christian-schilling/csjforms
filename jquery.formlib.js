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
    templates:{
        fieldset:'<fieldset><legend><%= label %></legend></fieldset>',
    },
    widgets:{
        text: function(options) {
            return extend({
                template : '<label><%= label %></label><input type="text" name="<%= name %>">',
                create : function(parentdef,jqs) {
                    jqs.append(template(this.template,{name:parentdef.name,label:to_verbose(parentdef)}));
                    var jqs = jqs.children('[name='+this.name+']');
                    return jqs;
                },
                tojson : function(jqs) { return jqs.val(); },
                fromjson : function(jqs,jsonobj) { jqs.val(jsonobj);}
            },options);
        },
        textarea: function(options) {
            return extend(extend(csjforms.widgets.text(),{
                template : '<label><%= label %></label><textarea rows=20 cols=80 name="<%= name %>"></textarea>',
            }),options);
        },
    },
    fields:{
        text: function(options) {
            return extend({
                widget : csjforms.widgets.text(),
                tojson : function(jqs){
                    return this.widget.tojson(jqs.children('[name='+this.name+']'));
                },
                fromjson : function(jqs,jsonobj){
                    this.widget.fromjson(jqs.children('[name='+this.name+']'),jsonobj);
                },
                create : function(parentdef,jqs) {
                    jqs.append('<div class="csjformfield" title="'+this.name+'"></div>');
                    var jqs = jqs.children('.csjformfield:last');
                    this.widget.create(this,jqs);
                    return jqs;
                },
            },options);
        },
    },
    fieldset: function(options) {
        return extend({
            template:'<fieldset><legend><%= label %></legend></fieldset>',
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
                var field;
                for(var i in this.fields) {
                    field = this.fields[i];
                    jsonobj[field.name] = field.tojson(jqs.children('[title='+field.name+']'));
                }
                return jsonobj;
            },
            fromjson : function(jqs,jsonobj){
                var field;
                for(var i in this.fields) {
                    field = this.fields[i];
                    field.fromjson(jqs.children('[title='+field.name+']'),jsonobj[field.name]);
                }
            },
        },options);
    },
    inline: function(options) {
        return extend({
            template :'<div class="csjformset" title="<%= name %>">'
                     +'    <h1><%= label %></h1>'
                     +'    <input type="submit" name="add_<%= name %>" value="+" class="addbutton">'
                     +'</div>',
            create : function(parentdef,jqs) {
                jqs.append(template(this.template,{name:this.name,label:to_verbose(this)}));
                var jqs = jqs.children('.csjformset[title='+this.name+']');
                var that = this;
                jqs.children('input.addbutton[name=add_'+this.name+']').click(function(){
                    that.append_fieldset($(this).parent());
                    return false;
                });
                return jqs;
            },
            append_fieldset : function(jqs) {
                return this.fieldset.create(this,jqs);
            },
            tojson : function(jqs) {
                var jsonobj = [];
                var that = this;
                jqs.children('fieldset').each(function(){
                    jsonobj.push(that.fieldset.tojson($(this)));
                });
                return jsonobj;
            },
            fromjson : function(jqs,jsonobj){
                for(var i in jsonobj){
                    this.fieldset.fromjson(this.append_fieldset(jqs),jsonobj[i]);
                }
            },
        },options);
    },
};

})();

