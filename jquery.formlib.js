(function($){

$.csjforms= {
    widgets:{
        text: {template:'<label><%= name %></label><input type="text" name="<%= name %>">'},
        textarea: {template:'<label><%= name %></label><textarea rows=20 cols=80 name="<%= name %>"</textarea>'},
    },
    templates:{
        fieldset:'<fieldset id="<%= name %>"><legend><%= name %></legend></fieldset>',
        inline:'<div id="<%= name %>"><input type="submit" name="add_<%= name %>" value="+"></div>',
    },
};
widgets = $.csjforms.widgets;
templates = $.csjforms.templates;

$.fn.csjfieldset = function(def) {

    make_field = function(fieldname,opts) {
        return template(opts.widget.template,{name:fieldname});
    };

    obj = this;
    $.each(def,function(fieldname,opts){
        if(opts.inline){
            obj.append(template(templates.inline,{name:fieldname}))
               .children("div#"+fieldname)
               .children("input[value=+]")
               .click(function(){
                   subfieldname = fieldname+'__'+$(this).parent().children("fieldset").size();
                   $(this).parent()
                          .append(template(templates.fieldset,{name:subfieldname}))
                          .children("fieldset#"+subfieldname)
                          .csjfieldset(opts.inline);
                });
        } else {
            obj.append(make_field(fieldname,opts));
        }
    });
    return this;
};

$.fn.csjform = function(def){
    return this.submit(function(){return false;})
               .prepend(template(templates.fieldset,{name:def.name}))
               .children("fieldset#"+def.name)
               .csjfieldset(def.form);
};

})(jQuery);

