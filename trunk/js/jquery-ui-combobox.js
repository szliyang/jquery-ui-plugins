/*
 * jQuery UI Combobox 0.0.9
 *
 * Copyright 2012, Chad LaVigne
 * Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php) 
 *
 * http://code.google.com/p/jquery-ui-plugins/wiki/Combobox
 *
 * Depends:
 *  jquery 1.8.2
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *	jquery.ui.position.js
 */
$.widget("uiplugins.combobox", {
	options: {
		"buttonClass": "",
		"buttonStyle": {},
		"height": 20,
		"ignoreCase": true,
		"inputClass": "",
		"inputStyle": {},
		"maxHeight": 200,
		"searchType": "startsWith", // specify what type of search the auto complete does, valid values are contains or startsWith
		"width": 200
	},
	_create: function() {
		var self = this;				
		var $select = this.element.addClass("ui-combobox-select").hide(),
			selected = $select.children(":selected"),
			value = selected.val() ? selected.text() : "";
		var $input = this.$input = $("<input />")
			.keydown(function(event) {
				var $this = $(this);
				// if they hit arrow down and the list isn't showing, show the whole thing regardless of the current value
				if(event.which == $.ui.keyCode.DOWN && !$this.autocomplete("widget").is(":visible")) {
					$this.autocomplete("search", "");
					return false;
				}
			})			
			.height(this.options.height)
			.insertAfter($select)
			.val(value)
			// wrap elements in a div because they're floated to make the tops align but we don't want the widget floated
			.wrap($("<div></div>").addClass("ui-combobox"))
			.autocomplete({
				delay: 0,
				minLength: 0,
				source: function(request, response) {
					var quantifier = self.options.searchType == "startsWith" ? "^" : "";					
					var modifier = self.options.ignoreCase && self.options.ignoreCase !== "false" ? "i" : "";					
					var matcher = new RegExp(quantifier + $.ui.autocomplete.escapeRegex(request.term), modifier);
					
					response($select.children("option").map(function() {
						var text = $(this).text();
						if (this.value && (!request.term || matcher.test(text))) {
							return {
								// this regex highlights the matching part of the label
								label: text.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + $.ui.autocomplete.escapeRegex(request.term) + ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<strong>$1</strong>"),
								value: text,
								option: this
							};
						}
					}));					
				},
				select: function( event, ui ) {
					ui.item.option.selected = true;
					self._trigger("select", event, {
						"item": ui.item.option
					});
				},
				change: function(event, ui) {
					if (!ui.item) {
						// check the contents of the text field and see if it matches the text of any options
						var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex($(this).val()) + "$", "i");
						var valid = false;
						
						$select.children("option").each(function() {							
							if (this.text.match(matcher)) {
								this.selected = valid = true;
								$select.val(this.value);
								self._trigger("change", event, {"item": this});
								return false;
							}
						});
						
						if (!valid) {
							// remove invalid value that didn't match anything, just set the value back to what it was							
							$(this).val($select.children("option:selected").text());
							return false;
						}
					}
				},
				open: function(event, ui) {					
					self._trigger("open");					
				},
				close: function() {
					self._trigger("close");
				}
			})
			.addClass("ui-widget ui-widget-content ui-corner-left ui-combobox-input" + (this.options.inputClass ? " " + this.options.inputClass : ""))
			.css(this.options.inputStyle);
		
		
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
		
		var $button = this.$button = $("<button>&nbsp;</button>")
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
			.addClass("ui-corner-right ui-button-icon ui-combobox-button" + (this.options.buttonClass ? " " + this.options.buttonClass : ""))
			.css(this.options.buttonStyle)
			.height(this._getButtonHeight())
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
		
		$input.width(this.options.width - $button.width());		
	},
	_getButtonHeight: function() {
		return this.$input.height() + Number(this.$input.css("border-top-width").replace("px", "")) + Number(this.$input.css("border-bottom-width").replace("px", ""));
	},
	_setOption: function(option, value) {
		
		switch(option) {				
			case "width":
				this.$input.width(value - this.$button.width());					
				break;
			case "height":
				this.$input.height(value);
				this.$button.height(this._getButtonHeight());				
				break;	
			case "maxHeight":
				this.$input.autocomplete("widget").css("max-height", value + "px");
				break;
			case "buttonClass":				
				this.$button.removeClass(this.options.buttonClass).addClass(value);
				break;
			case "buttonStyle":
				if(typeof value === 'string') {
					value = $.parseJSON(value);
				}					
				this.$button.css(value);
				break;
			case "inputClass":
				this.$input.removeClass(this.options.inputClass).addClass(value);
				break;
			case "inputStyle":
				if(typeof value === 'string') {
					value = $.parseJSON(value);
				}					
				this.$input.css(value);
				break;			
		}
		
		$.Widget.prototype._setOption.apply(this, arguments);
	},
	disable: function() {
		$.Widget.prototype.disable.call(this);
		this.close();
		this.$input.addClass("ui-state-disabled").attr("disabled", "disabled");
		this.$button.addClass("ui-state-disabled").button('disable');
		this._trigger("disable");
	},
	enable: function() {
		$.Widget.prototype.enable.call(this);
		this.$input.removeClass("ui-state-disabled").removeAttr("disabled");
		this.$button.removeClass("ui-state-disabled").button('enable');
		this._trigger("enable");
	},
	open: function() {
		this.$input.autocomplete("search", "").select();
		this._trigger("open");
	},
	close: function() {
		this.$input.autocomplete("close");
		this._trigger("close");
	},
	destroy: function() {
		var $select = this.element;
		$select.next("div.ui-combobox").remove();
		$select.show();
		$.Widget.prototype.destroy.call(this);		
	}
});