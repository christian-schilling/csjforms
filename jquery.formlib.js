(function($){

$.csjforms= {
    widgets:{
        text: {
            template:'<label><%= label %></label><input type="text" name="<%= name %>">',
            tojson:function(val){return val;},
        },
        textarea: {
            template:'<label><%= label %></label><textarea rows=20 cols=80 name="<%= name %>"></textarea>',
            tojson:function(val){return val;},
        },
    },
    templates:{
        fieldset:'<fieldset><legend><%= label %></legend><input type="submit" name="del_<%= name %>" value="-"></fieldset>',
        inline:'<div class="formset" title="<%= name %>"><h1><%= label %></h1><input type="submit" name="add_<%= name %>" value="+"></div>',
    }, }; widgets = $.csjforms.widgets; templates = $.csjforms.templates;

function ucfirst(str) {
    var firstLetter = str.substr(0, 1);
    return firstLetter.toUpperCase() + str.substr(1);
}
function to_verbose(name,opts) {
    if(opts.verbose) return opts.verbose;
    else return ucfirst(name);
}
function to_plural(name,opts) {
    if(opts.plural) return opts.plural;
    else return to_verbose(name,opts)+'s';
}

tojson = function(def,obj) {
    var jsonobj= new Object();
    if(obj.is("fieldset")) {
        obj.children().each(function(){
            var id = $(this).attr('name') || $(this).attr('title');
            if(id && def[id]) {
                val = tojson(def[id],$(this));
                jsonobj[id] = val;
            }
        });
        return jsonobj;
    } else if(obj.parent().is("fieldset")){
        if(!def.inline){
            return obj.val();
        }else{
            var jsonarray = [];
            obj.children("fieldset").each(function(){
                val = tojson(def.inline,$(this));
                jsonarray.push(val);
            });
            return jsonarray;
        }
    };
};

prepend_fieldset = function(obj,fieldname,opts) {

    obj.before(template(templates.fieldset,{name:fieldname,label:to_verbose(fieldname,opts)}))
       .prev()
       .csjfieldset(opts.inline)
       .children("input[value]=-").click(function(){$(this).parent().remove();});
};

fromjson = function(def,obj,jsonobj) {
    if(obj.is("fieldset")) {
        obj.children().each(function(){
            var id = $(this).attr('name') || $(this).attr('title');
            if(id && def[id]) {
                if(!def[id].inline) { $(this).val(jsonobj[id]);}
                else if (jsonobj[id] != []){
                    for(var i in jsonobj[id]){
                        prepend_fieldset($(this).children('input[value=+]').eq(0),id,def[id]);
                        fromjson(def[id].inline,$(this).children('fieldset:last'),jsonobj[id][i]);
                    }
                }
            }
        });
    }
};

$.fn.csjfieldset = function(def) {

    make_field = function(fieldname,opts) {
        return template(opts.widget.template,{name:fieldname,label:to_verbose(fieldname,opts)});
    };

    var obj = this;
    $.each(def,function(fieldname,opts){
        if(opts.inline){
            obj.append(template(templates.inline,{name:fieldname,label:to_plural(fieldname,opts)}))
               .children("div[title="+fieldname+']')
               .children("input[value=+]")
               .click(function(){ prepend_fieldset($(this),fieldname,opts); });
        } else {
            obj.append(make_field(fieldname,opts));
        }
    });
    return this;
};

$.fn.csjform = function(def,callback,data){
    this.submit(function(){return false;})
        .prepend(template(templates.fieldset,{name:def.name,label:to_verbose(def.name,def)}))
        .children("fieldset")
        .csjfieldset(def.fields);

    var obj = this.children("fieldset").eq(0);

    this.find("input#save").click(function(){
        callback(tojson(def.fields,obj));
    });

    if(data) fromjson(def.fields,obj,data);
};

})(jQuery);

