from django.urls import path
from drf_spectacular.views import SpectacularAPIView
from .api import EstimateView, HealthView, QuoteView, ReadinessView, ServiceStatusView
from accounts.api import (
    AccountExportView, CsrfView, EmailVerifyResendView, EmailVerifyView, LoginView, LogoutView, MeView,
    PasswordResetConfirmView, PasswordResetRequestView, SignUpView,
)
from ledger.api import LedgerView
from sharing.api import ChatShareLinkView, ShareLinkRevokeView, SharedChatView
from files.api import FileCollectionView, FileDownloadView
from model_catalog.api import ModelCollectionView
from model_catalog.api import CapabilityView
from media.api import MediaCollectionView, MediaDownloadView
from runs.api import CompareRunCollectionView, RunCancelView, RunCollectionView, RunDetailView, RunEventStreamView
from workspace.api import ArtifactCollectionView, ArtifactDetailView, ChatCollectionView, ChatDetailView, MessageDocumentExportView, MessageSlideExportView, ProjectCollectionView, ProjectDetailView, RecipeCollectionView

urlpatterns = [
    path("api/v1/health", HealthView.as_view(), name="health"),
    path("api/v1/ready", ReadinessView.as_view(), name="ready"),
    path("api/v1/status", ServiceStatusView.as_view(), name="status"),
    path("api/v1/auth/csrf", CsrfView.as_view(), name="csrf"),
    path("api/v1/auth/sign-up", SignUpView.as_view(), name="sign-up"),
    path("api/v1/auth/login", LoginView.as_view(), name="login"),
    path("api/v1/auth/logout", LogoutView.as_view(), name="logout"),
    path("api/v1/auth/password-reset", PasswordResetRequestView.as_view(), name="password-reset"),
    path("api/v1/auth/password-reset/confirm", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("api/v1/auth/verify-email", EmailVerifyView.as_view(), name="verify-email"),
    path("api/v1/auth/verify-email/resend", EmailVerifyResendView.as_view(), name="verify-email-resend"),
    path("api/v1/me/export", AccountExportView.as_view(), name="account-export"),
    path("api/v1/me", MeView.as_view(), name="me"),
    path("api/v1/ledger", LedgerView.as_view(), name="ledger"),
    path("api/v1/models", ModelCollectionView.as_view(), name="models"),
    path("api/v1/capabilities", CapabilityView.as_view(), name="capabilities"),
    path("api/v1/chats/<uuid:chat_id>/share-links", ChatShareLinkView.as_view(), name="chat-share-links"),
    path("api/v1/share-links/<uuid:link_id>/revoke", ShareLinkRevokeView.as_view(), name="share-link-revoke"),
    path("api/v1/shares/<str:token>", SharedChatView.as_view(), name="shared-chat"),
    path("api/v1/files", FileCollectionView.as_view(), name="files"),
    path("api/v1/files/<uuid:file_id>/download", FileDownloadView.as_view(), name="file-download"),
    path("api/v1/media", MediaCollectionView.as_view(), name="media"),
    path("api/v1/media/<uuid:asset_id>/download", MediaDownloadView.as_view(), name="media-download"),
    path("api/v1/runs/quote", QuoteView.as_view(), name="run-quote"),
    path("api/v1/runs/estimate", EstimateView.as_view(), name="run-estimate"),
    path("api/v1/runs", RunCollectionView.as_view(), name="runs"),
    path("api/v1/runs/compare", CompareRunCollectionView.as_view(), name="compare-runs"),
    path("api/v1/runs/<uuid:run_id>", RunDetailView.as_view(), name="run-detail"),
    path("api/v1/runs/<uuid:run_id>/cancel", RunCancelView.as_view(), name="run-cancel"),
    path("api/v1/runs/<uuid:run_id>/events", RunEventStreamView.as_view(), name="run-events"),
    path("api/v1/projects", ProjectCollectionView.as_view(), name="projects"),
    path("api/v1/projects/<uuid:project_id>", ProjectDetailView.as_view(), name="project-detail"),
    path("api/v1/chats", ChatCollectionView.as_view(), name="chats"),
    path("api/v1/chats/<uuid:chat_id>", ChatDetailView.as_view(), name="chat-detail"),
    path("api/v1/artifacts", ArtifactCollectionView.as_view(), name="artifacts"),
    path("api/v1/artifacts/<uuid:artifact_id>", ArtifactDetailView.as_view(), name="artifact-detail"),
    path("api/v1/recipes", RecipeCollectionView.as_view(), name="recipes"),
    path("api/v1/messages/<uuid:message_id>/exports/slides", MessageSlideExportView.as_view(), name="message-slide-export"),
    path("api/v1/messages/<uuid:message_id>/exports/document", MessageDocumentExportView.as_view(), name="message-document-export"),
    path("api/schema", SpectacularAPIView.as_view(), name="openapi-schema"),
]
