ut_relogin
==========

Catches failed AJAX requests under UTLogin when a user is logged out, allowing them to login again.

Overview
========
...

Usage
=====

To include this app in your Django project, simply pull it into your project via `svn:externals` and place it on your PYTHONPATH. For example, using the `utdirect.utils.setup_extra()` functionality provided by PyPE, you can use these parameters:

> path: extra/ut_relogin

> URL: ~~https://github.com/UT-Austin-FIS/ut_relogin/tags/v1.0/ut_relogin~~

Setup
=====

1. Add "`ut_relogin`" to your `INSTALLED_APPS` setting:
      ```python
      INSTALLED_APPS = (
          # ...
          'ut_relogin',
          # ...
      )
      ```

1. Add the `ut_relogin` middleware to your `MIDDLEWARE_CLASSES` setting:
      ```python
      MIDDLEWARE_CLASSES = (
          # ...
          'ut_relogin.middleware.UtReloginHeadTagMiddleware',
          # ...
      )
      ```
