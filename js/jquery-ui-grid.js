/*
 * jQuery UI Grid 0.0.9
 *
 * Copyright 2012, Chad LaVigne
 * Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php) 
 *
 * http://code.google.com/p/jquery-ui-plugins/wiki/Grid
 *
 * Depends:
 *  jquery 1.8.2
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *	jquery.event.drag-2.0.js
 *	slick.core.js
 *	slick.grid.js
 *	slick.dataview.js
 */
;(function($, undefined) {
	$.widget("uiplugins.grid", {
		options: {
			rowKey: "id",
			data: [],
			columns: [], // sorting defaults to true so that we get text & number sorting for free, if you specify a sort function we use that for compare, if you don't want sorting you have to opt out with sort: false
			// columns can have the following values for filter "startsWith", "contains", array of values or a function that receives the item and returns true/false
			// default value and caseSensitive are also options on the filter
			// it would be cool if filter was either just a string (e.g. "startsWith") or an array of options but we need a home for defaultFilterValue & caseSensitive, could put
			// caseSensitive in string name like "startsWithIgnoreCase" but still have issue of how to pass in defaultValue, probably better as an object property on the param than a separate param
			enableCellNavigation: true,
			enableColumnReorder: false,
			showHeaderRow: false // if filters are turned on, these needs to be true
		},		
		_create: function() {
			var self = this,
				opts = this.options,
				dataView = this.dataView = new Slick.Data.DataView();	
			this.element.addClass('ui-grid');
			this._initSortAndFilterFunctions();
			opts.showHeaderRow = this.filters ? true : false;
			var grid = this.grid = new Slick.Grid(this.element, this.dataView, opts.columns, opts);
			
			if(this.filters) {
				this._renderFilters();
				
				$(this.grid.getHeaderRow()).on("change keyup", "input, select", function(e) {
					//updateColumnFilter($(this).data('columnId'));
					var columnId = $(this).data('columnId');
					if (!columnId) {
						return; // this check shouldn't be required but there's some occasional flakiness with the delegate that mandates it
					}
		            self.filters[columnId].value = $.trim($('#ui-grid-filter-' + columnId).val());				
            		//filterPostProcessing();
					self.dataView.refresh();
					grid.invalidate();
				});	
			}
			grid.onSort.subscribe(function(e, args) {
	            sortcol = args.sortCol.field;	
	            // using native sort with comparer
	            // preferred method but can be very slow in IE with huge datasets      
	            self.dataView.sort(self.sortFunctions[args.sortCol.id], args.sortAsc);	           
	            grid.invalidate();
	        });			
						
			grid.onColumnsReordered.subscribe(function() {
				self._renderFilters();
			});
		
			grid.onColumnsResized.subscribe(function() {
				self._renderFilters();
			});
			
			dataView.beginUpdate();
			dataView.setItems(opts.data, opts.rowKey);
			dataView.endUpdate();
			grid.invalidate();
		},
		_initSortAndFilterFunctions: function() {
			var sortFunctions = {};
			var filters = {};
			var hasFilters = false;
			var columns = this.options.columns;
			
			for(var i = 0; i < columns.length; i++) {
				var col = columns[i];
				
				if(col.sort !== false) {
					col.sortable = true;
					
					if(typeof col.sort === "function") {
						sortFunctions[col.id] = col.sort;
					} else {
						sortFunctions[col.id] = this._compare;
					}
				}		
				
				if(col.filter) {
					hasFilters = true;					
					//filters[col.id] = $.extend({}, col.filter, {"value": col.filter.defaultValue});
					// filter is either a string or an array
					
					
					// if the filter is an object, it's a custom filter and we expect an impl attribute that's a function that will do the filtering
					// if the custom filter has an options attribute, we render a list and it's value is used in the custom filter otherwise we do a text field
					if(col.filter.impl) {
						filters[col.id] = $.extend(col.filter, {"type": "custom", "value": col.filterDefaultValue});						
					} else {
						var isList = $.isArray(col.filter);
						var type = isList ? 'list' : col.filter;
						var options = isList ? col.filter : null;
						filters[col.id] = {"type": type, "value": col.filterDefault, "options": options};
					}					
				}
			}
			
			this.sortFunctions = sortFunctions;
			
			if(hasFilters) {				
				this.filters = filters;
				var self = this;			
				this.dataView.setFilter(function(item) {
					return self._filter(item);
				});
			}			
		},	
		_renderFilters: function() {
			var self = this;
			var grid = this.grid;
			var columns = grid.getColumns();
			
			for(var i = 0; i < columns.length; i++) {
				var column = columns[i];
				var filter = self.filters[column.id];
				
                if(filter) {
                    var header = grid.getHeaderRowColumn(column.id);
                    $(header).empty();

                   // if (column.filter && column.filter.renderer) {
                   //     column.filter.renderer.call(column, column.filter.rendererOptions, header, _columnFilters[column.id]);
                   // } else {
                    var id = 'ui-grid-filter-' + column.id;
                    var value = filter.value ? filter.value : '';
                    
                    switch(filter.type) {
                    	case 'list':
                    		self._renderDropDownFilter(id, header, column, filter.options);
                    		break;
                    	default:
                    		$('<input id="' + id + '" type="text" class="ui-grid-filter" value="' + value + '">')
                    		.appendTo(header)
                    		.data("columnId", column.id)
                    		.width($(header).width() - 4)
                    		.height($(header).height() - 12);                   	
                	}	
                    /*if(filter.options) {
                    	self._renderDropDownFilter(id, header, column, filter.options);
                    } else {
                    	$('<input id="' + id + '" type="text" class="ui-grid-filter" value="' + value + '">')
                    		.appendTo(header)
                    		.data("columnId", column.id)
                    		.width($(header).width() - 4)
                    		.height($(header).height() - 12);
                    }*/
                    
                   // }
                }
			}
		},
		_renderDropDownFilter: function(id, header, column, options) {
			var html = '<select id="' + id + '" class="ui-grid-filter">';
			html += '<option value=""></option>';
			var filterValue = this.filters[column.id].value;
			
			for(var i = 0; i < options.length; i++) {
				var option = options[i];
				var value = option.value ? option.value : option;
				var name = option.name ? option.name : option;				
				html += '<option value="' + value + '"' + (value === filterValue ? 'selected' : '') + '>' + name + '</option>';								
			}			
            html += '</select>';
            $(html).appendTo(header)
            	.data("columnId", column.id)
            	.width($(header).width() - 4)
                .val(filterValue);
		},
		_filter: function(item) {		
			var grid = this.grid;
            var filters = this.filters;
            
			if (item && filters) {
				var result = true;
            
	            for (var columnId in filters) {
	            	var filter = filters[columnId];
	            		              
	            	if(filter && filter.value) {
	                    var columns = grid.getColumns();
	                    var column = columns[grid.getColumnIndex(columnId)];
	                    
	                    if (column == null || column == undefined){
	                    	//column is in the filter list, but is not visible, no need to filter
	                    	continue;
	                    }
	                    
	                    var itemVal = item[column.field] + '';
	                    
	                    if(itemVal) {
	                    	switch(filter.type) {
		                    	case 'startsWith':
		                    		result =  itemVal.toLowerCase().startsWith(filter.value);
		                    		break;
		                    	case 'endsWith':
		                    		result =  itemVal.toLowerCase().endsWith(filter.value);
		                    		break;
		                    	case 'contains':
		                    		result =  itemVal.toLowerCase().indexOf(filter.value) > -1;
		                    		break;
		                    	case 'doesNotContain':
		                    		result =  itemVal.toLowerCase().indexOf(filter.value) === -1;
		                    		break;
		                    	case 'list':
		                    		result = itemVal === filter.value;
		                    		break;
		                    	case 'custom':
		                    		result = filter.impl.call(filter, filter.value, itemVal);
	                    	}	                    	                   
	                    }
	
	                    if (!result) {  // short circuit if we can
	                        return result;
	                    }
	                    //var filterVal = $('#ui-grid-filter-' + columnId).val();
	
	                    //if (column.filter && column.filter.impl) {
	                    //    result = column.filter.impl.call(filterVal, column, item);
	                    //} else { // default filter is a case insensitive text comparison...
//	                        result = itemVal && itemVal.toLowerCase().indexOf(filter.value) > -1;
	                   // }	                    
	                }
	            }
			}
            
            return true;        
		},
		_compare: function(row1, row2) {			
			var val = row1[sortcol], val2 = row2[sortcol];			
			return (val == val2 ? 0 : (val > val2 ? 1 : -1));
		},
		getSelectedItems: function() {
			return this.grid.getSelectionModel().getSelectedItemIds();
		},
		setSelectedItems: function() {
			
		},
		disable: function() {
			$.Widget.prototype.disable.call(this);			
			this._trigger("disable");
		},
		enable: function() {
			$.Widget.prototype.enable.call(this);			
			this._trigger("enable");
		},		
		destroy: function() {
			//this.grid.onColumnsReordered.unsubscribe(renderFilters);
			//this.grid.onColumnsResized.unsubscribe(renderFilters);
			$.Widget.prototype.destroy.call(this);		
		}
	});
})(jQuery);