/* AJAX MODULE */
;(function(html, window) {
    'use strict';

    var setTimeout = window.setTimeout,
        document   = window.document,
        XMLHttpRequest = window.XMLHttpRequest;
    /**
     * Promise pattern for calling asynchronous code, usually ajax/setTimeout/setInterval
     * @param {Function} task - Task to do asynchronously
     */
    html.Promise = function(task) {
        // 1. Make sure to return a new instance of html.Promise,
        //   regardless of using new keyword
        if (!(this instanceof html.Promise)) {
            return new html.Promise(task);
        }

        // 2. Let self be the context
        var self = this;

        // 3. Done and fail actions
        self.doneActions = [];
        self.failActions = [];

        // 4. Resolve function, use to call all done functions
        self.resolve = function(val) {
            // run all done methods on fulfilled
            self.doneActions.forEach(function(f) {
                if (f != null) {
                    f(val);
                }
            });
        };

        // 5. Reject function, use to call fail function
        self.reject = function(reason) {
            // a. Run all fail methods on rejected
            self.failActions.forEach(function(f) {
                if (f != null) {
                    f(reason);
                }
            });
        };

        // promise done method, use to set done methods, these methods will be call when the resolve method called
        // we can call done and then as many times as we want
        self.done = function(action) {
            if (typeof action === 'function') {
                // only push the callback to the queue if it is a function
                self.doneActions.push(action);
            }
            return self;
        };

        // promise fail method, use to set fail method, the method will be call when the reject method called
        // only call fail method once
        self.fail = function(action) {
            if (typeof action === 'function') {
                // only set the callback if it is a function
                self.failActions.push(action);
            }
            return self;
        };

        // Execute the task
        setTimeout(function() {
            task(self.resolve, self.reject);
        });
    };

    /**
     * Event when script loaded and execute success
     * Clear the jsonpId property of script element
     * Set the script to be null, avoid memory leak
     * @param {Element} newScript - Script element
     */
    function scriptLoaded(newScript) {
        // remove the node after finish loading
        newScript.parentElement.removeChild(newScript);
        // remove reference of jsonp callback
        var jsonpId = newScript.jsonpId;
        html.ajax['jsonpId' + jsonpId] = undefined;
        // set the script node null, for release memory (I think this doesn't help too much)
        newScript = null;
    }

    // Let jsonpId be 0,
    // for generating jsonp preprocessor without conflict
    var jsonpId = 0,

        // Let mockSetup be an empty array,
        // this is for mocking data in testing
        mockSetup = [];

    /**
     * Ajax method
     * @param {String} url - The Url to request resource
     * @param {Object} data - Parameters to submit
     * @param {String} [method = "GET"] - Ajax method
     * @param {Boolean} [async = true] - Indicate that the request is asynchronous
     */
    html.ajax = function(url, data, method, async) {
        // Return a new instance of html.ajax
        // regardless of using new keyword
        if (!(this instanceof html.ajax)) {
            return new html.ajax(url, data, method, async);
        }

        var jsonp,
            header = {}, parser = null, timeout = null,
            username, password;

        // 1. Set default value for method and async
        //    NOTE: synchronous ajax request is depreciated
        method = method || 'GET';
        async = async !== undefined ? async : true;

        // 2. Create a new instance of Promise to deal with async ajax task
        var promise = html.Promise(function(resolve, reject) {
            var mock = mockSetup.find(function(item) {
                return item.url === url;
            });
            if (mock != null) {
                resolve(mock.data);
                return;
            }
            // Process jsonp first if there come a jsonp callback
            if (jsonp) {
                // a. Create script node to load resource from another server
                var src = url + (/\?/.test(url) ? "&" : "?"),
                    head = document.getElementsByTagName('head')[0],
                    newScript = document.createElement('script'),
                    params = [],
                    param_name = "";

                jsonpId++;

                // b. Save the reference of jsonp callback
                html.ajax['jsonpId' + jsonpId] = jsonp;
                data = data || {};

                // c. Append callback to data
                data.callback = "html.ajax.jsonpId" + jsonpId;

                // d. Append all parameters to the url
                for (param_name in data) {
                    if (data.hasOwnProperty(param_name)) {
                        params.push(param_name + "=" + encodeURIComponent(data[param_name]));
                    }
                }
                src += params.join("&");
                newScript.type = "text/javascript";
                newScript.src = src;

                // e. Append the request to header,
                //    to trigger browser loading the resource
                head.appendChild(newScript);

                // f. Save the callback id to element
                //    this action for removing callback function after load script
                newScript.jsonpId = jsonpId;

                // g. Binding load event to the jsonp script node
                if (newScript.onreadystatechange !== undefined) {
                    newScript.onload = newScript.onreadystatechange = function() {
                        if (this.readyState === 'complete' || this.readyState === 'loaded') {
                            scriptLoaded(newScript);
                        }
                    };
                } else {
                    //html(newScript).onLoad(scriptLoaded);
                }
                return;
            } // end of JsonP

            // Init XHR object
            var x = new XMLHttpRequest();

            // Open connection to server, with username, password if available
            x.open(method, url, async, username, password);

            // Register statechange event
            x.onreadystatechange = function() {
                if (x.readyState === 4 && x.status === 200) {
                    var res;
                    try {
                        // give parser a try
                        res = parser != null ? parser(x.responseText || x.responseXML) : x.responseText || x.responseXML;
                    } catch (e) {
                        // reject the promise if the parser not work
                        reject('Invalid data type.', x);
                    }
                    // call resolve method when the ajax request success
                    resolve(res);
                } else if (x.readyState === 4 && x.status !== 200) {
                    // call reject method when the ajax request fail
                    reject(x.response, x);
                }
            };

            // Set header for the request if available
            for (var h in header) {
                if (header.hasOwnProperty(h)) {
                    x.setRequestHeader(h, header[h]);
                }
            }

            // Set timeout for the request if available
            if (timeout && timeout > 0) {
                // handle time out exception
                x.timeout = timeout;
                x.ontimeout = function() { reject('timeout', x); };
            }

            // Submit the request
            x.send(data);
        });

        /**
         * JsonP - Cross domain purpose
         * @param {Function} callback - Callback event handler for JsonP
         */
        this.jsonp = function(callback) {
            jsonp = callback;
            return this;
        };

        /*
         * Authenticate request with username and password
         * @param {String} user - Username
         * @param {String} pass - Password
         * @return {html.Promise} Promise of ajax request, for fluent API
         */
        this.authenticate = function(user, pass) {
            username = user;
            password = pass;
            return this;
        };

        /*
         * Set header for a request
         * Extend the header object instead of replace it
         * @param {String|Object} key - Key of header,
         *        or an object that contains key value pairs of header
         * @param {String} arg - Value of header
         * @return {html.Promise} Promise
         */
        this.header = function(key, arg) {
            if (arg !== undefined && typeof key === 'function') {
                header[key] = arg;
            } else {
                html.extend(header, key);
            }
            return this;
        };

        /**
         * Set parser to ajax request
         * @param {Function} p - Parser function
         * @return {html.Promise} Promise
         */
        this.parser = function(p) {
            parser = p;
            return this;
        };

        /**
         * Set timeout to ajax request
         * @param {Number} miliseconds - Milisecond that timeout event occurs
         * @return {html.Promise} Promise
         */
        this.timeout = function(miliseconds) {
            timeout = miliseconds;
            return this;
        };

        this.contentType = function(contentType) {
            html.extend(header, { 'Content-type': contentType });
            return this;
        };

        // Set done and fail method to ajax
        this.done = promise.done;
        this.fail = promise.fail;
    };

    /**
     * Mock ajax request
     * @param {String} url - Url string to mock
     * @param {Object} data - Data that we expect to return
     */
    html.ajax.mock = function(url, data) {
        mockSetup.push({
            url: url,
            data: data
        });
    };

    /**
     * Clear mock data that have been registered
     * @param {String|String[]|undefined} url -
     */
    html.ajax.clearMock = function(url) {
        while (mockSetup.length) {
            mockSetup.pop();
        }
    };

    // create shorthand for request JSON format with 'GET' method
    html.getJSON = function(url, data, async) {
        var query = [];
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                // get all parameters and append to query url
                query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
            }
        }
        // do ajax request, and pass JSON parser for user
        // return a promise to user
        return html.ajax(query.length ? url + '?' + query.join('&') : url, null, 'GET', async)
            .parser(JSON.parse);
    };

    // create shorthand for request JSON format with 'POST' method
    html.postJSON = function(url, data, async) {
        // do ajax request, and pass JSON parser for user
        // return a promise to user
        return html.ajax(url, JSON.stringify(data), 'POST', async)
            .header({ 'Content-type': 'application/json' })
            .parser(JSON.parse);
    };

    /**
     * Partial loading a view, along with scripts and styles
     * @param {String} url Partial view url
     * @param {String|Element} containerSelector Selector of the container which the partial view append to
     */
    html.partial = function(url, containerSelector) {
        if (containerSelector == null) {
            throw 'containerSelector is null or undefined';
        }

        // 1. Let ele be html context, scripts and doneActions be empty arrays
        var ele = html(containerSelector).context,
            bundle = null, doneActions = [];

        // 2. Call the ajax for loading partial
        var promise = html.ajax(url);

        // 3. After loading partial view
        promise.done(function(view) {
            // a. Empty the element before append partial
            html(ele).empty();

            // b. Append the view to container
            ele.innerHTML = view;

            // c. Remove reference for avoiding memory leak
            ele = null;

            // d. If bundle is not null
            if (bundle != null) {
                // i. Load the script bundle
                var scriptLoaded = html.scripts.render(bundle);

                // ii. When script loaded
                scriptLoaded.done(function() {
                    // execute all done actions callback here
                    doneActions.forEach(function(action) {
                        if (action != null) {
                            action(view);
                        }
                    });
                });
            } else {
                doneActions.forEach(function(action) {
                    if (action != null) {
                        action(view);
                    }
                });
            }
        });

        /**
         * Load bundle/script after load partial
         * @param {String|String[]} scriptBundle - Script bundle to load after partial
         * @return Promise
         */
        promise.scripts = function(scriptBundle) {
            bundle = scriptBundle; // save the bundle
            return promise;
        };

        // override done action
        // we will call all done actions after loading partial view and scripts
        promise.done = function(action) {
            if (typeof action === 'function') {
                // only push the callback to the queue if it is a function
                doneActions.push(action);
            }
            return promise;
        };
        return promise;
    };

})(this.html, this);

/* END OF AJAX MODULE */