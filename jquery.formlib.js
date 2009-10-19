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
        fieldset:'<fieldset><legend><%= label %></legend></fieldset>',
        inlinefieldset:'<fieldset><legend><%= label %></legend><input type="submit" name="del_<%= name %>" value="-" class="delbutton"></fieldset>',
        inline:'<div class="csjformset" title="<%= name %>"><h1><%= label %></h1><input type="submit" name="add_<%= name %>" value="+" class="addbutton"></div>',
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

append_fieldset = function(formset,fieldname,opts) {
    formset.children('.addbutton').before(
        template(templates.inlinefieldset, {
            name:fieldname,label:to_verbose(fieldname,opts)
        })
    );

    formset.children('fieldset:last')
           .csjfieldset(opts.inline)
           .children("input.delbutton").click(function(){$(this).parent().remove();});
};

tojson = function(def,obj) {
    if(obj.is("fieldset")) {
        var jsonobj = new Object();
        obj.children('.csjformset,.csjformfield').each(function(){
            var id = $(this).attr('title');
            jsonobj[id] = tojson(def[id],$(this));
        });
    }else if(obj.is('.csjformset')){
        var jsonobj = [];
        obj.children("fieldset").each(function(){
            val = tojson(def.inline,$(this));
            jsonobj.push(val);
        });
    }else if(obj.is(".csjformfield")){
        jsonobj = obj.find('input,textarea,select').val();
    }
    return jsonobj;
};

fromjson = function(def,obj,jsonobj) {
    if(obj.is("fieldset")) {
        obj.children('.csjformset,.csjformfield').each(function(){
            var id = $(this).attr('title');
            fromjson(def[id],$(this),jsonobj[id],id);
        });
    }else if(obj.is('.csjformset')){
        for(var i in jsonobj){
            append_fieldset(obj,obj.attr('title'),def);
            fromjson(def.inline,obj.children('fieldset:last'),jsonobj[i]);
        }
    }else if(obj.is(".csjformfield")){
        obj.find('input,textarea,select').val(jsonobj);
    }
};

$.fn.csjfieldset = function(def) {

    make_field = function(fieldname,opts) {
        return '<div class="csjformfield" title="'+fieldname+'">'
              +template(opts.widget.template,{
                    name:fieldname,
                    label:to_verbose(fieldname,opts)
               })
              +'</div>';
    };

    var obj = this;
    $.each(def,function(fieldname,opts){
        if(opts.inline){
            obj.append(template(templates.inline,{name:fieldname,label:to_plural(fieldname,opts)}))
               .children("div[title="+fieldname+']')
               .children("input.addbutton")
               .click(function(){ append_fieldset($(this).parent(),fieldname,opts); });
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

