from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpResponse
from django.views.generic.base import View, TemplateView

DEFAULT_TIMEOUT_SECONDS = 7

try:
    _module_path, _ctx_class = settings.UT_RELOGIN_CONTEXT.rsplit('.', 1)
    module = __import__(_module_path, fromlist=[_ctx_class])
    ContextClass = getattr(module, _ctx_class)
except AttributeError:
    raise ImproperlyConfigured(
        'You must supply a dotted path your own RequestContext subclass by '
        'setting UT_RELOGIN_CONTEXT in settings.py.'
    )


class ReloginRedirect(TemplateView):
    """
    Provides a target on the same host as the consuming application for
    relogin, so that UT Login credentials are retreived for that host.
    """
    template_name = 'ut_relogin/redirected.html'

    def get_context_data(self, **kwargs):
        ctx = super(ReloginRedirect, self).get_context_data(**kwargs)
        if hasattr(settings, 'UT_RELOGIN_MESSAGE'):
            msg = settings.UT_RELOGIN_MESSAGE
        else:
            msg = ''
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
    """
    Provides a simple endpoint for AJAX requests to sniff whether UT Login
    credentials have expired.
    """
    response = HttpResponse('ok')

    def get(self, request):
        return self.response
