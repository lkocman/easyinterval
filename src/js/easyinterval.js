/*
 * EasyInterval
 * Copyright (c) 2012 Lubos Kocman. All rights reserved.
 */

var bb10_hi_color = '#bcba00'; // required in init() + verifyInputs()
var user_input = new Array();
var interval_obj = null;
var db = null;
var remove_mode = false; // used in favourites
var active_list;	

function init() {
	initDB(); // Init html 5 databases
	document.addEventListener('webworksready', function(e) {			
		// You must call init on bbUI before any other code loads.  
		// If you want default functionality simply don't pass any parameters.. bb.init();
		try {
			community.preventsleep.setPreventSleep(true); // preventing sleep
		} catch (err) {
			console.log("failed to run setPreventSleep");
		}
		bb.init({actionBarDark: true,
				controlsDark: true,
				listsDark: true,
				bb10ForPlayBook: false,
				highlightColor: bb10_hi_color,
				// Fires "before" styling is applied and "before" the screen is inserted in the DOM
				onscreenready: function(element, id) {
									if (id == 'dataOnLoad') {
										dataOnLoad_initialLoad(element);
									} else if (id == 'masterDetail') {
										masterDetail_initialLoad(element);
									}
									
									// Remove all titles "except" input and pill buttons screen if running on BB10
									if (bb.device.isBB10 && (id != 'input') && (id != 'pillButtons')) {
										var titles = element.querySelectorAll('[data-bb-type=title]');
										if (titles.length > 0) {
											titles[0].parentNode.removeChild(titles[0]);
										}
									}
									
								},
				// Fires "after" styling is applied and "after" the screen is inserted in the DOM
				ondomready: function(element, id) {
									if (id == 'dataOnTheFly') {
										dataOnTheFly_initialLoad(element);
									}


									// Handling pages

									if (id == "new") {
										console.log("new");
											// set user input favourite && delay to defaults
										user_input = new Array(); // reset user data
										user_input['delay'] = 1000;
										user_input['favourite'] = false;
											/* stop interval when user hit back */
											// stopInterval();
											
									}	

									if (id == "digitizer") {
										startInterval($('#digitizerwrap'), $('#repetions_label'));
									}

									if (id == "history") {
											history_elmnt = document.getElementById("history_list");
											genHistory(history_elmnt);
											active_list = history_elmnt;
									}

									if (id == "favourites") {
											fav_elmnt = document.getElementById("favourites_list");
											genFavourites(fav_elmnt);
											active_list = fav_elmnt;
									}
								}
				});
		bb.pushScreen('menu.htm', 'menu');
	}, false);
}


function startInterval(parent_elmnt, elmnt_repetions) {
	console.log("startInterval()");
	console.log(user_input);
	insertIntoDB(user_input['interval1'], user_input['interval2'], user_input['repetions'], user_input['delay'], user_input['favourite']);

	interval_obj = new IntervalTimer();
	$(document).unbind("intervalFinished");
	$(document).bind("intervalFinished", function() {
		interval_obj.fireNext();
	});

	interval_obj.addInterval(user_input['interval1'] * 1000, 'resources/tripple_beep_short.mp3', parent_elmnt);
	if (! isNaN(user_input['interval2'])) {
		interval_obj.addInterval(user_input['interval2'] * 1000, 'resources/tripple_beep_short.mp3', parent_elmnt);
		// hide second digitizer + set size to one line
	}
	interval_obj.setRepetions(user_input['repetions'], elmnt_repetions);

	if (interval_obj.intervals.length) {
		if (user_input['delay'] > 1000) {
			console.log("unhiding");
			$('#delay_label').css({'display' : 'block'});
		}
		console.log("Starting in " + user_input['delay'] / 1000 + " seconds.");
		initDelay = setTimeout(function () {
			$('#delay_label').css({'display' : 'none'}); // always hide the delay label
			console.log("Firing!");
			playSound('resources/tripple_beep_short.mp3');
			interval_obj.fireNext();
		}, user_input['delay']);
	}
}

function stopInterval() {
	console.log("Cancelling All");
	clearTimeout(initDelay);
	interval_obj.cancelAllIntervals(); /* must be called before clearAll */
	interval_obj.clearAll();
}

function playSound(src) {
	setTimeout(function () {new Audio(src).play();}, 0);
}

function setValues(db_row) {

	if (db_row) {
		user_input['interval1']	 = db_row.int1;
		user_input['interval2']	 = db_row.int2;
		user_input['delay'] = db_row.delay;
		user_input['repetions'] = db_row.repeat;
	} else {

		$("input").each(function(index) {	
			user_input[$(this).attr("id")] = parseInt($(this).val());
		});
	}
	console.log(user_input);
}

function delayChecked(checked) {
	if (checked) {
		user_input["delay"]=10000;
	} else {
		user_input["delay"]=1000; // always wait at least 1 second it's really better
	}
}

function favouritesChecked(checked) {
	if (checked) {
		user_input["favourite"]=true;
	} else {
		user_input["favourite"]=false;
	}
}

function verifyInputs() {
	// verifies inputs on new.html dialog
	validInputs = true;
	$("input").each(function(index) {
		myval = parseInt($(this).val());
		if (isNaN(myval) || myval <= 0 || myval >= (100*60)) { // do not exceed 99:59
			console.log($(this).attr("id"));
			if ($(this).attr("id").toString() == "interval2" && $(this).val() == "") {
				console.log("skipping interval2");
			} else {
				validInputs = false;
				$(this).css({'border' : '5px solid '+ bb10_hi_color.toString()});
				setTimeout(function() {cancelHighlight();}, 1500);
			}
		}
	});

	console.log("validInputs: " + validInputs);
	if (validInputs) {
		setValues(null); /* do not load the data for db */
		bb.pushScreen('digitizer.htm', 'digitizer'); // this needs to be done separately
	}

	return validInputs;
}

function cancelHighlight()	{
	//clears hilighting of input fields on new.html
	$("input").each(function(index) {
		myval = $(this).css({'border' : 'none'});
	});
}

// formating stuff

function sec2secmin (secs) {
		minutes = Math.floor(secs / 60);
		seconds = secs % 60;
		return ("0" + minutes.toString()).slice(-2) + ":" + ("0" + seconds.toString()).slice(-2);
}

function getFontSize(nchars) {
	// so far we want to get ideal font-size based on device width and height + number of characters
	// in my case font has font.width ~ font.height / 2 and font size is given in height.
	magic_constant = 1.6; // could be 1.5 in some cases
	font_size =  Math.floor($(window).width() / parseInt(nchars)) * magic_constant;
	console.log("setting font to size: " + font_size.toString());
	return font_size;
}


// DB related


/* html5 database */

function insertIntoDB(interval1, interval2, repeat, delay, favourite) {
	if (favourite) {
		insertIntoFavourites(interval1, interval2, repeat, delay);
	}
	var now = new Date();
	insertIntoHistory(interval1, interval2, repeat, delay, now);
}

function initDB() {
	db = openDatabase('easyinterval', '1.0', 'easyinterval database', 2 * 1024 * 1024);
	db.transaction(function (tx) {
		tx.executeSql('CREATE TABLE IF NOT EXISTS history (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, int1, int2, repeat, delay, datetime)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS favourites (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, int1, int2, repeat, delay)');
	});
}

function insertIntoHistory(int1, int2, repeat, delay, datetime) {
	db.transaction(function (tx) {
		tx.executeSql('INSERT INTO history (int1, int2, repeat, delay, datetime) VALUES (?, ?, ?, ?, ?)',
			[int1, int2, repeat, delay, datetime]);
	});
}

function insertIntoFavourites(int1, int2, repeat, delay) {
	db.transaction(function (tx) {
		tx.executeSql('INSERT INTO favourites (int1, int2, repeat, delay) VALUES (?, ?, ?, ?)',
			[int1, int2, repeat, delay]);
	});
}

function genHistory() {
				db.transaction(function (tx) {
					tx.executeSql('SELECT * FROM history ORDER BY id DESC', [], function (tx, results) {
  						var len = results.rows.length, i;
  						history_elmnt.innerHTML = ""; /* erase content */
  						for (i = 0; i < len; i++) {
  							var child = document.createElement('div');
  							var delay_str;
  							rec = results.rows.item(i)
							child.setAttribute('data-bb-type','item');
							delay_str = "";
							if (parseInt(rec.delay) / 1000 > 1) {
								delay_str = " / delay";
							}

							child.setAttribute('data-bb-title',
								sec2secmin(rec.int1/1000).toString() + ' / ' + 
								sec2secmin(rec.int2/1000).toString() + ' x' +
								results.rows.item(i).repeat.toString() + delay_str +'\n');
							child.setAttribute('data-bb-style', 'arrowlist');
							/* ugly hack otherwise problems with closures */
							child.onclick = (function(table_name, record_id) {return function(){ listItemClicked(table_name, record_id) } }("history", rec.id));
							child.innerHTML = 'Executed on: ' + rec.datetime.toString();
							history_elmnt.appendItem(child);
  						}
  					});
				});
			}

function genFavourites() {
	db.transaction(function (tx) {
		tx.executeSql('SELECT * FROM favourites ORDER BY id DESC ', [], function (tx, results) {
			var len = results.rows.length, i;
			fav_elmnt.innerHTML=""; /* erase content */
			for (i = 0; i < len; i++) {
				var child = document.createElement('div');
				var delay_str;
				rec = results.rows.item(i)
				child.setAttribute('data-bb-type','item');
				delay_str = "";
				if (parseInt(rec.delay) / 1000 > 1) {
					delay_str = " / delay";
				}

				child.setAttribute('data-bb-title',
					sec2secmin(rec.int1/1000).toString() + ' / ' + 
					sec2secmin(rec.int2/1000).toString() + ' x' +
					results.rows.item(i).repeat.toString() + delay_str +'\n');
				child.setAttribute('data-bb-style', 'arrowlist');
				console.log(rec.id);
				/* ugly hack otherwise problems with closures */
				child.onclick = (function(table_name, record_id) {return function(){ listItemClicked(table_name, record_id) } }("favourites", rec.id));
				child.setAttribute('data-bb-img','resources/star.png');
				fav_elmnt.appendItem(child);
  			}
		});
	});
}

function listItemClicked(table_name, item_id) {
	/* this function should work for both favourites and history */
	db.transaction(function (tx) {
		if (! remove_mode) {
			tx.executeSql('SELECT * FROM ' + table_name + ' where id = ' + item_id.toString(), [], function (tx, results) {
				setValues(results.rows.item(0));
				bb.pushScreen('digitizer.htm', 'digitizer')
			});
		} else {
			/* APPLIES only to Favourites --- remove record from db */
			tx.executeSql('DELETE FROM ' + table_name + ' where id = ' + item_id.toString(), [], function (tx, results) {
				setRemoveMode(false);
				genFavourites();

			});
		}
	});
}

function setRemoveMode(val) {
	/* tells what action will happen on listItemClicked */
	remove_mode = val;
}

function clearAllHistory() {
	db.transaction(function (tx) {
		tx.executeSql('DELETE from history');
	});
}

function clearAllFavs() {
	db.transaction(function (tx) {
		tx.executeSql('DELETE from favourites');
	});
}


// The base classes
function Interval(intervalLength, notification, elmnt) {
	this.intervalLength = intervalLength;
	this.notify_url = notification;
	this.countdownInterval = null;
	this.secondsLeft = 0 // just to declare it
	this.counter = elmnt; // where to display countdown
	//this.notify.volume = 1.0;

	this.fire = function() {
		this.secondsLeft = this.intervalLength / 1000; // fire is called multiple times so set it here
		console.log("waiting " + this.intervalLength + " miliseconds.");
		this.sec2html(); // display initial time left
		this.countdownInterval = setInterval(function() {self.setCounter();}, 1000);
		var self=this;
		this.timeout = setTimeout(function () {	
			playSound(self.notify_url);
			clearInterval(self.countdownInterval);
			 // workaround when there is e.g. 1 left
			$(document).trigger('intervalFinished', ['Custom', 'Event']);
		}, this.intervalLength + 1000);
	}

	this.setCounter = function () {
		if (this.secondsLeft > 0)
			this.secondsLeft--;

		this.sec2html();	
	}

	this.stop = function () {
		clearTimeout(this.timeout);
		clearInterval(this.countdownInterval);
	}

	this.sec2html = function () {
		this.counter.html(sec2secmin(this.secondsLeft));
	}
}

function IntervalTimer() {
	this.intervals = new Array();
	this.intervalIndex = 0;
	this.repetions = 0;  // means 1 repetion;

	this.addInterval = function (intervalLength, notification, parent_elmnt) {
		var child = $('<div class="digital">'+ sec2secmin(intervalLength / 1000) + '</div>');
		child.css({'font-size' :  getFontSize(5).toString() + 'px', 'color' : '#ffffff'});
		parent_elmnt.append(child);
		this.intervals.push(new Interval(intervalLength, notification, child));

	}

	this.setRepetions = function (repetions, elmnt) {
		this.repetions = repetions - 1;
		this.repetions_elmnt = elmnt;
		console.log(this.repetions);
	}

	this.clearAll = function () {
		this.intervals = new Array();
		this.intervalIndex = 0;
		this.repetions = 0;
		this.secondsLeft = 0
	}

	this.cancelAllIntervals = function () {
		for (x = 0; x < this.intervals.length; x++) {
			this.intervals[x].stop();
		} 
	}

	this.repetions2html = function () {
		// internally tracked as -1
		this.repetions_elmnt.html(this.repetions + 1);
	}

	this.fireNext = function () {
		// next series
		if ((this.intervalIndex == this.intervals.length)  && this.repetions > 0) {
			this.repetions--;
			this.intervalIndex = 0;
		}

		this.repetions2html()
		
		// replace audio of last interval by finish.mp3
		if (this.intervalIndex == this.intervals.length -1 && ! this.repetions) {
			console.log("chaning audio to finish.mp3");
			this.intervals[this.intervalIndex].notify_url = "resources/finish.mp3";
			this.intervals[this.intervalIndex].fire();
			this.intervalIndex++;
			return;

		// cleanup
		} else if (this.intervalIndex > this.intervals.length - 1)  {
			console.log("all finished");
			stopInterval();
			setTimeout(function() {
			bb.pushScreen('menu.htm', 'menu');
			}, 1000);
			return;
		}
		this.intervals[this.intervalIndex].fire();
		this.intervalIndex++;
	}
}