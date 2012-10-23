$.widget("uiplugins.combobox", {
	options: {		
		"maxHeight": 200,
		"matchValue": true, // TODO: implement this, determines if the autocomplete searches on option values or the option text,
		"containsSearch": true // TODO: implement this, option to specify if we should do a contains search or just a starts with
	},
	_create: function() {
		var self = this;		
		// wrap everything in a div, the elements are floated to make the tops align but we don't want the widget floated
		var select = this.element.hide(),
			selected = select.children(":selected"),
			value = selected.val() ? selected.text() : "";
		this.element.addClass("ui-combobox-select");
		var $input = $("<input />")
			.keydown(function(event) {
				var $this = $(this);
				// if they hit arrow down and the list isn't show, just show the whole thing regardless of the current value
				if(event.which == $.ui.keyCode.DOWN && !$this.autocomplete("widget").is(":visible")) {
					$this.autocomplete("search", "");
					return false;
				}
			})
			.addClass('ui-combobox-input')
			.insertAfter(select)
			.val(value)
			.wrap($("<div></div>").addClass("ui-combobox"))
			.autocomplete({
				delay: 0,
				minLength: 0,
				source: function(request, response) {
					var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
					response(select.children("option").map(function() {
						var text = $(this).text();
						if (this.value && (!request.term || matcher.test(text))) {
							return {
								label: text.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + $.ui.autocomplete.escapeRegex(request.term) + ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<strong>$1</strong>"),
								value: text,
								option: this
							};
						}
					}));
				},
				select: function( event, ui ) {
					ui.item.option.selected = true;
					self._trigger("selected", event, {
						item: ui.item.option
					});
				},
				change: function(event, ui) {
					if (!ui.item) {
						// check the contents of the text field and see if it matches the text of any options
						var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex($(this).val()) + "$", "i");
						var valid = false;

						select.children("option").each(function() {							
							if (this.text.match(matcher)) { // we're matching on option text here instead of value, need to add an option to specify which to match on so the user can do either
								this.selected = valid = true;
								return false;
							}
						});
						
						if (!valid) {
							// remove invalid value, as it didn't match anything
							$(this).val("");
							select.val("");
							return false;
						}
					}
				}
			})
			.addClass("ui-widget ui-widget-content ui-corner-left");
		
		$input.keydown(function(event) {
			var key = event.which;
			
			if(key == $.ui.keyCode.DOWN && !$input.autocomplete("widget").is(":visible")) {
				$input.autocomplete("search", "");
			}
		});
		
		$input.data("autocomplete")._renderItem = function(ul, item) {
			ul.addClass("ui-combobox-list");
			ul.css("max-height", self.options.maxHeight);	
			return $("<li></li>")
				.data("item.autocomplete", item)
				.append("<a>" + item.label + "</a>")
				.appendTo(ul);
		};				   
		
		$("<button>&nbsp;</button>")
			.attr("tabIndex", -1)
			.attr("title", "Show All Items")
			.insertAfter($input)
			.button({
				icons: {
					primary: "ui-icon-triangle-1-s"
				},
				text: false
			})									
			.removeClass("ui-corner-all")
			.addClass("ui-corner-right ui-button-icon ui-combobox-button")
			.height($input.height() + Number($input.css("border-top-width").replace("px", "")) + Number($input.css("border-bottom-width").replace("px", "")))
			.mousedown(function() {
				// close if already visible				
				if ($input.autocomplete("widget").is(":visible")) {
					$input.autocomplete("close");
					return;
				}
				// pass empty string as value to search for, displaying all results
				$input.autocomplete("search", "").select();
				return false;
			});
		
	},
	destroy: function() {
		var $select = this.element;
		$select.next("div.ui-combobox").remove();
		$select.show();
		$.Widget.prototype.destroy.call(this);		
	}
});