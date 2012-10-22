/*
 * jQuery UI Text 0.0.9
 *
 * Copyright 2012, Chad LaVigne
 * Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php) 
 *
 * http://code.google.com/p/jquery-ui-plugins/wiki/Text
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 */
;(function($, undefined) {
	$.widget('uiplugins.text', {  
		options: {			
			'filter': null, // type of filter to apply, valid values are numeric, digits, alpha
			'allow': null, // array or string of characters that should be allowed, even if filtered out by filter			
			'whitelist': null, // white list of valid characters, everything else is excluded regardless of other filter
			'blacklist': null // black list of characters that are never valid			
		},
		_create: function() {
			var self = this;
			self._initFilters();
			
			this.element.addClass('ui-text');
			this.element.bind('keydown', function(event) {
				var result = self._isValidKeyPress(event);
				
				if(!result.valid) {
					self._trigger('keyEventSuppressed', event, {"key": result.key});
				}
				
				return result.valid;					
			});
		},
		_isValidKeyPress: function(keyEvent) {
			var valid = true;
			var key = keyEvent.which;
			var emptyChar = (key >= $.ui.keyCode.SHIFT && key <= $.ui.keyCode.CAPS_LOCK) || key == $.ui.keyCode.ESCAPE || (key > $.ui.keyCode.SPACE && key <= $.ui.keyCode.DOWN) || key == $.ui.keyCode.INSERT || (key >= $.ui.keyCode.COMMAND && key <= $.ui.keyCode.COMMAND_RIGHT) || (key >= $.ui.keyCode.NUM_LOCK && key <= $.ui.keyCode.SCROLL_LOCK);
			var alwaysValid = key == 0 || key == $.ui.keyCode.BACKSPACE || key == $.ui.keyCode.DELETE || (event.ctrlKey && key == $.ui.keyCode.A) || key == $.ui.keyCode.TAB;
			var value = $.ui.keyCode.keyCode2Char(keyEvent.keyCode, keyEvent.shiftKey);

			if(!(emptyChar || alwaysValid)) {
							
				if(this.filterRegex) {
					valid = !value.match(this.filterRegex);
				}
				
				// if there's a whitelist nothing else is allowed so don't even bother with allow regex
				if(this.whitelistRegex) {
					valid = valid && !value.match(this.whitelistRegex);
				} else if(this.allowRegex) {
					// allow is an exception to the filter, so if it passes the filter OR it's on the allow list
					valid = valid || !value.match(this.allowRegex);
				}
				
				if(this.blacklistRegex) {				
					valid = valid && !value.match(this.blacklistRegex);
				} 
			}			
			
			return {"valid": valid, "key": value};
		},				
		_initFilters: function() {			
			switch(this.options.filter) {
				case 'numeric':
					this.filterRegex = new RegExp('[^0-9.]');
					break;
				case 'digits':
					this.filterRegex = new RegExp('[^0-9]');					
					break;
				case 'alpha':
					this.filterRegex = new RegExp('[^a-zA-Z]');
					break;				
			}
						
			this.allowRegex = this._createCharsRegEx(this.options.allow, true);
			this.whitelistRegex = this._createCharsRegEx(this.options.whitelist, true);												
			this.blacklistRegex = this._createCharsRegEx(this.options.blacklist, false);									
		},
		_createCharsRegEx: function(chars, negate) {
			var regex = null;
			
			if(chars && chars.length) {
				if(typeof chars === 'string') {
					chars = this._toCharArray(chars);
				}
				
				regex = new RegExp('[' + (negate ? '^' : '') + this._buildCharsExpr(chars) + ']');				
			}
			
			return regex;
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
		_toCharArray: function(charString) {
			var charArray = new Array();
			for(var i = 0; i < charString.length; i++) {
				charArray[i] = charString.charAt(i);
			}
			
			return charArray;
		},
		_setOption: function(option, value) {
			$.Widget.prototype._setOption.apply(this, arguments);
			
			this._initFilters();			
		},
		enable: function() {			
			this.element.removeAttr('disabled');			
			$.Widget.prototype.enable.call(this);
			this._trigger('enable', null, this.element);
		},
		disable: function() {
			this.element.attr('disabled', 'disabled');
			$.Widget.prototype.disable.call(this);
			this._trigger('disable', null, this.element);
		},
		destroy: function() {
			this.element.removeClass('ui-text');
			this.element.unbind();			
		}
	});
})(jQuery);