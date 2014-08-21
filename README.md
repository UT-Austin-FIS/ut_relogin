ut_relogin
==========

Catches failed AJAX requests for resources under UTLogin where there failure is
due to an expired session, allowing the user to login again to retry the action
that triggered the original AJAX request.

Setup
=====

To include this app in your PyPE project, simply pull it into your project via
`svn:externals` and place it on your `PYTHONPATH`. For example, if you're using
the `utdirect.utils.setup_extra()` functionality with a project-level folder
named 'extra', you can use these `svn:externals` parameters:

> path: extra/ut_relogin

> URL: ~~https://github.com/UT-Austin-FIS/ut_relogin/tags/v1.0/ut_relogin~~

Then, install it into your Django project:

1. Add "`ut_relogin`" to your `INSTALLED_APPS` setting:
      ```python
      # settings.py
      # ...
      INSTALLED_APPS = (
          # ...
          'ut_relogin',
          # ...
      )
      ```

1. Add the middleware to your `MIDDLEWARE_CLASSES` setting:
      ```python
      # settings.py
      # ...
      MIDDLEWARE_CLASSES = (
          # ...
          'ut_relogin.middleware.UtReloginHeadTagMiddleware',
          # ...
      )
      ```

1. Add the URLs to your root URLconf:
      ```python
      # urls.py
      # ...
      import ut_relogin.urls

      urlpatterns = (
          # ...
          url(r'^', include(ut_relogin.urls)),
      )

      ```

Explanation
===========

Before the transition to [UTLogin](http://www.utexas.edu/its/utlogin/), under
[Central Web Authentication](http://www.utexas.edu/its/utlogin/Compare%20to%20CWA)
(CWA), AJAX requests that were sent with an invalid session received 200-status
responses from the CWA machinery. Despite being a "success" in HTTP terms,
these responses could be inspected for clues indicating that they in fact
came from failed authentication, instead of containing the intended data.

Under UTLogin, however, requests with expired sessions are redirected to a
central server on a different subdomain, which the browser cannot follow
because of its
[same-origin policy](http://en.wikipedia.org/wiki/Same-origin_policy). The
browser can't send the original request to this host, so it reports the attempt
as a failure.  Because the browser handles the original redirect response,
there is no way to inspect it from JavaScript code, say to inspect the Location
header to see if it's pointing at the UTLogin host.

## The Old Way: Central Web Authentication

In the old CWA system, every host implemented the same login page. Thus,
whenever a user's session expired, or they logged out, any further requests
would be redirected to a path **on the same host** where the user could login
again and get new cookies. The login form would redirect them back to their
original location via a GET; any POST data would be lost, and the destination
page would be responsible for dealing with the unexpected GET from the logon
form.

There is an older version of `ut_relogin` that would intercept form submissions
and AJAX requests when the response from the host was the login page. It would
put up a jQuery modal with the login page, let the user enter their
credentials, and then close and re-submit the original request. This doesn't
work under UTLogin.

## The New Way: UTLogin

There are two major differences in behavior under UTLogin:
* All login pages are served from a single host; while every host under UTLogin
  has something installed to connect it to UTLogin, the only place that users
  will be getting login pages is from the central UTLogin host.
* The login page doesn't allow itself to be embedded in an iframe
  (`X-Frame-Options: Deny`).

This project attempts to provide consistent user experiernce by detecting
expired sessions and giving the user a login window.

### First request after login
After a user logs in to UTLogin, they will be forwarded to their intended
destination.

#### Plain GET/POST
The first request for a resource on a given host is redirected to the UTLogin
host, which checks the user's credentials and automatically POSTs a form with
the credentials back to the original host. The agent on the intended server
grabs the credentials from the POST body, sets a cookie, and redirects the user
to their original destination. POST and GET data are retained.

#### AJAX
Although most users will have already done a normal request to a host to get
the JavaScript code that does AJAX requests, it's possible that the first
request to a host after login in is an AJAX request. For example, a user
could have two windows open with resources from two different UTLogin servers.
Say their session expires and they re-authenticate on host A; if they switch
to their host B window and take an action on the still-loaded page that
triggers an AJAX request, that request will fail. The UTLogin machinery will
redirect the request to the login host, which is a cross-domain request that
the browser will prohibit.

`ut_relogin` addresses this situation by giving the user a new login window
that redirects to host B. If the user already has a valid session and only
needs to go through the UTLogin redirect cycle, the window that opens will
accomplish that. Then, the user can redo their action that triggered the
AJAX call, which will now behave normally.

### While logged in
#### Plain GET/POST
#### AJAX

### All requests after logout / session expiration
#### Plain GET/POST
#### AJAX

