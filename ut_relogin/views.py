from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.views.generic.base import TemplateView

try:
    module_path, ctx_class = settings.RELOGIN_CONTEXT.rsplit('.',1)
    module = __import__(module_path, fromlist=[ctx_class])
    context = getattr(module, ctx_class)
except AttributeError:
    raise ImproperlyConfigured(
        'You must supply a path your own context object by setting a '
        'RELOGIN_CONTEXT in your settings.py file.'
    )

class ReloginRedirect(TemplateView):
    template_name = 'ut_relogin/redirected.html'

    def get_context_data(self, **kwargs):
        ctx = super(ReloginRedirect, self).get_context_data(**kwargs)
        try:
            msg = settings.RELOGIN_MESSAGE
        except AttributeError:
            raise ImproperlyConfigured(
                'You must add a RELOGIN_MESSAGE to your settings. Example: '
                'We have refreshed your login.  Thank you.'
            )
        ctx.update({'msg':msg})
        return context(
            self.request,
            ctx,
            title='UT Relogin Success',
            page_title='UT Relogin Success',
            window_title='UT Relogin Success',
            )
