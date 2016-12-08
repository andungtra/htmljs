/**
 * Document ready implementation
 * https://github.com/addyosmani/jquery.parts/blob/master/jquery.documentReady.js
 */
(function (html, window) {
	'use strict';

	var document = window.document,
		setTimeout = window.setTimeout;

	html.ready = function (callback) {
		registerOrRunCallback(callback);
		bindReady();
	};
	var readyBound = false,
		isReady = false,
		callbackQueue = [],
		registerOrRunCallback = function (callback) {
			if (typeof callback === 'function') {
				callbackQueue.push(callback);
			}
		},
		documentReadyCallback = function () {
			while (callbackQueue.length) {
				(callbackQueue.shift())();
			}
			registerOrRunCallback = function (callback) {
				callback();
			};
		},

		// The ready event handler
		DOMContentLoaded = function () {
			if (document.addEventListener) {
				document.removeEventListener('DOMContentLoaded', DOMContentLoaded, false);
			} else {
				// we're here because readyState !== 'loading' in oldIE
				// which is good enough for us to call the DOM ready!
				document.detachEvent('onreadystatechange', DOMContentLoaded);
			}
			documentReady();
		},

		// Handle when the DOM is ready
		documentReady = function () {
			// Make sure that the DOM is not already loaded
			if (!isReady) {
				// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
				if (!document.body) {
					return setTimeout(documentReady, 1);
				}
				// Remember that the DOM is ready
				isReady = true;
				// If there are functions bound, to execute
				documentReadyCallback();
				// Execute all of them
			}
		}, // /ready()

		bindReady = function () {
			var toplevel = false;

			if (readyBound) {
				return;
			}
			readyBound = true;

			// Catch cases where $ is called after the
			// browser event has already occurred.
			if (document.readyState !== 'loading') {
				documentReady();
			}

			// Mozilla, Opera and webkit nightlies currently support this event
			if (document.addEventListener) {
				// Use the handy event callback
				document.addEventListener('DOMContentLoaded', DOMContentLoaded, false);
				// A fallback to window.onload, that will always work
				window.addEventListener('load', DOMContentLoaded, false);
				// If IE event model is used
			} else if (document.attachEvent) {
				// ensure firing before onload,
				// maybe late but safe also for iframes
				document.attachEvent('onreadystatechange', DOMContentLoaded);
				// A fallback to window.onload, that will always work
				window.attachEvent('onload', DOMContentLoaded);
				// If IE and not a frame
				// continually check to see if the document is ready
				try {
					toplevel = window.frameElement === null;
				} catch (e) { }
				if (document.documentElement.doScroll && toplevel) {
					doScrollCheck();
				}
			}
		},

		// The DOM ready check for Internet Explorer
		doScrollCheck = function () {
			if (isReady) {
				return;
			}
			try {
				// If IE is used, use the trick by Diego Perini
				// http://javascript.nwbox.com/IEContentLoaded/
				document.documentElement.doScroll('left');
			} catch (error) {
				setTimeout(doScrollCheck, 1);
				return;
			}
			// and execute any waiting functions
			documentReady();
		};

})(this.html, this);
  /* End Document ready implementation */