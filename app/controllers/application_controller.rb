class ApplicationController < ActionController::Base
  before_action :redirect_to_apex_domain, if: -> { Rails.env.production? }
  around_action :switch_locale

  private

  # Canonicalise www -> apex, so the two hostnames never split SEO signals or
  # disagree with the canonical tag the page emits.
  def redirect_to_apex_domain
    return unless request.host.start_with?("www.")

    redirect_to("#{Site::HOST}#{request.fullpath}", status: :moved_permanently, allow_other_host: true)
  end

  def switch_locale(&action)
    locale = params[:locale].presence_in(Site::LOCALES.map(&:to_s)) || Site::DEFAULT_LOCALE
    I18n.with_locale(locale, &action)
  end

  # Keeps :locale in every generated *_path without threading it by hand.
  def default_url_options = { locale: I18n.locale }
end
