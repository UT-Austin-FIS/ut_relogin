// http://stackoverflow.com/questions/6884616/intercept-all-ajax-calls

window.utrelogin = {}; // claim a global scope.

/**
 * Callback registry; needs to live at global scope
 *
 * @type {Object}
 */
window.utrelogin.callback_registry = {};

(function(factory, window) {
    'use strict';

    /*global jQuery:false, define:false */

    /* --- Install the module --- */
    if (typeof define === 'function' && define.amd) {
        // TODO: This is really ugly. Is there a better way to pass non-AMD params?
        define('_windowGlobal', [], function() { return window; });
        define(['jquery', '_windowGlobal'], factory);
    } else {
        // relies on browser global jQuery
        factory(jQuery, window);
    }
}(function($, window, undefined) {
    'use strict';

    /**
     * Regular expression for extracting the base url for the project.
     *
     * @private
     * @const
     * @type {RegExp}
     */
    var PROJ_BASE_REGEX = /^\/apps\/[^\/]+\/[^\/]+\//;

    /**
     * Login popup window options
     * @private
     * @const
     * @type {string}
     */
    var POPUP_OPTIONS = 'toolbar=yes,scrollbars=yes,resizable=yes,' +
                        'dependent=yes,height=500,width=800';

    /**
     * Log messages consistently.
     *
     * @param {String} msg
     *     Message to log
     * @private
     */
    function log(msg) {
        var logTime = new Date().getTime();
        console.info('==> [' + logTime + '] (jQuery.utRelogin) --> ' + msg);
    }

    /** Function for calculating the login redirect url.
     * @private
     * @return {string} A server-relative url for acct_lib's login_redirect.
     */
    function getLoginRedirectUrl() {
        var matches = PROJ_BASE_REGEX.exec(window.location.pathname);
        if (matches){
            var proj_base = matches[0];
            return proj_base + 'ut_relogin/redirect/';
        } else {
            return null;
        }
    }

    /**
     * Main function of the module. Call this to set it up.
     *
     * @public
     * @param {Object} configOptions
     *     Historical. ConfigOptions are ignored.
     *
     * @returns {void}
     */
    function utRelogin(configOptions) {
        var xhr_open = XMLHttpRequest.prototype.open;
        var xhr_send = XMLHttpRequest.prototype.send;

        function startLogin(){
            var redirect_url = getLoginRedirectUrl();
            log('opening login window');
            window.open(redirect_url, null, POPUP_OPTIONS);
        }

        function handleAsyncError() {
            log('handling async error');
            log('aborting async request');
            this.abort();
            startLogin();
        }

        function new_open(method, url, async, user, pass){
            this._open_args = arguments;
            this._async = async;
            this._same_origin_error = null;
            this._current_error = undefined;
            this.addEventListener('error', handleAsyncError, false);
            log('calling original XMLHttpRequest.open');
            xhr_open.call(this, method, url, async, user, pass);
        }

        function new_send(data){
            var scc =  state_change_closure(this, this.onreadystatechange);
            var no_call = false; // used by state_change to decide whether to call old.
            var sc_complete = false;

            function state_change_closure(self, old){
                if (!old){
                    old = function(){};
                }

                function state_change(){
                    log('readyState: ' + self.readyState + '; status: ' + self.status);

                    if (self.readyState === 4){
                        log('state changes are complete');
                        sc_complete = true;

                        if (self.status === 0){
                            self._same_origin_error = true;
                            log('SOE: ' + self._same_origin_error);
                        }
                    }

                    if (self._same_origin_error){
                        delete self._current_error; // we can assume this was the error
                        log('aborting request');
                        self.abort();
                        startLogin();
                    } else {
                        log('calling old onreadystatechange handler');
                        old.call(self);
                    }
                }
                return state_change;
            }

            this._data = data;
            if (this._async){
                log('adding onreadystatechange function');
                this.onreadystatechange = scc;
            }
            try {
                log('calling original XMLHttpRequest.send');
                xhr_send.call(this, data);
            } catch(err) {
                log('caught an error');
                // we need to defer action on this -- if it is a same origin error,
                // we can ignore it if login is triggered.
                this._current_error = err;
            } finally {
                // firefox doesn't fire on synchronous calls, but we need scc called
                if (!(this._async || sc_complete)){
                    log('request is not async OR state change is not complete');
                    no_call = true; // because user code
                    scc();
                }
                delete self._same_origin_error;
            }
        }

        XMLHttpRequest.prototype.open = new_open;
        XMLHttpRequest.prototype.send = new_send;
    }

    $.utRelogin = utRelogin;
    return utRelogin;
  },
  this));
