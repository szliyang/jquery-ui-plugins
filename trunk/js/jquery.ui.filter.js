/*
 * jQuery UI Filter 0.0.9
 *
 * Copyright 2012, Chad LaVigne
 * Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php) 
 *
 * http://code.google.com/p/jquery-ui-plugins/wiki/Filter
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 */
;(function($, undefined) {
	$.widget('ui.filter', {  
		options: {			
			'type': 'numeric', // type of filter, valid values are numeric, digits, alpha, alpha-numeric
			'exclude': null, // array of characters that aren't allowed
			'allow': null // array of characters that are allowed
		},
		_create: function() {
			var self = this;
			this.regex = '[^0-9.]';
			
			switch(this.options.type) {
				case 'digits':
					this.regex = '[^0-9]';					
					break;
				case 'alpha':
					this.regex = '[^a-zA-Z]';
					break;
				case 'exclude':
					this.regex = '[' + this._buildCharsExpr(this.options.chars) + ']';			
					break;
				case 'allow':
					this.regex = '[^' + this._buildCharsExpr(this.options.chars) + ']';
					break;
			}
			
			this.element.bind('keydown', function(event) {		
				if(!self._checkRegEx(event)) {
					return false;
				}
			});
		},
		_checkRegEx: function(keyEvent) {
			var value = $.ui.keyCode.keyCode2Char(keyEvent.keyCode, keyEvent.shiftKey);
			return !value.match(new RegExp(this.regex));
		},		
		_buildCharsExpr: function(chars) {
			var charsExpr = '';		
			
			for (var i = 0; i < chars.length; i++) {
				var c = chars[i];
	
				if (c == '\\') {
					charsExpr += '\\\\';
				} else if (c == '\'' || c == ']' || c == '~' || c == '`' || c == '-') {
					charsExpr += '\\' + c;
				} else {
					charsExpr += c;
				}
			}
			
			return charsExpr;
		},
		destroy: function() {
			this.element.unbind();			
		}
	});
})(jQuery);