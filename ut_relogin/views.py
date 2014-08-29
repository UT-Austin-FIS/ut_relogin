from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.http import HttpResponse
from django.views.generic.base import View, TemplateView

DEFAULT_TIMEOUT_SECONDS = 7

try:
    _module_path, _ctx_class = settings.UT_RELOGIN_CONTEXT.rsplit('.',1)
    module = __import__(_module_path, fromlist=[_ctx_class])
    ContextClass = getattr(module, _ctx_class)
except AttributeError:
    raise ImproperlyConfigured(
        'You must supply a path your own RequestContext class by setting a '
        'UT_RELOGIN_CONTEXT in your settings.py file.'
    )


class ReloginRedirect(TemplateView):
    template_name = 'ut_relogin/redirected.html'

    def get_context_data(self, **kwargs):
        ctx = super(ReloginRedirect, self).get_context_data(**kwargs)
        try:
            msg = settings.UT_RELOGIN_MESSAGE
        except AttributeError:
            raise ImproperlyConfigured(
                'You must add a UT_RELOGIN_MESSAGE to your settings. Example: '
                'We have refreshed your login.  Thank you.'
            )
        ctx.update({
            'msg': msg,
            'timeout': DEFAULT_TIMEOUT_SECONDS,
        })
        return ContextClass(
            self.request,
            ctx,
            title='UT Relogin Success',
            page_title='UT Relogin Success',
            window_title='UT Relogin Success',
        )

class FormProtectionView(View):
    response = HttpResponse('ok')

    def get(request):
        return self.response
