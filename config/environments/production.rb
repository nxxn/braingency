require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot. This eager loads most of Rails and
  # your application in memory, allowing both threaded web servers
  # and those relying on copy on write to perform better.
  # Rake tasks automatically ignore this option for performance.
  config.eager_load = true

  # Full error reports are disabled and caching is turned on.
  config.consider_all_requests_local = false
  config.action_controller.perform_caching = true

  # Ensures that a master key has been made available in ENV["RAILS_MASTER_KEY"], config/master.key, or an environment
  # key such as config/credentials/production.key. This key is used to decrypt credentials (and other encrypted files).
  # config.require_master_key = true

  # Heroku has no front-end web server, so Rails serves public/ itself. That
  # covers the GEP PDF, the Open Graph cards, robots.txt and the error pages.
  config.public_file_server.enabled = true
  config.public_file_server.headers = {
    # Fingerprinted assets are immutable; everything else in public/ is a
    # stable URL whose contents may be revised (the GEP PDF, OG cards), so it
    # gets a modest TTL with revalidation instead.
    "Cache-Control" => "public, max-age=3600, must-revalidate"
  }

  # Enable serving of images, stylesheets, and JavaScripts from an asset server.
  # config.asset_host = "http://assets.example.com"

  # Specifies the header that your server uses for sending files.
  # config.action_dispatch.x_sendfile_header = "X-Sendfile" # for Apache
  # config.action_dispatch.x_sendfile_header = "X-Accel-Redirect" # for NGINX

  # Deliberately NOT setting config.assume_ssl. kamal-proxy terminates
  # TLS and forwards X-Forwarded-Proto, which Rack already reads — so force_ssl
  # below can still tell an http request from an https one and upgrade it.
  # assume_ssl would make every request look secure and silently disable that
  # redirect.

  # Force all access to the app over SSL, use Strict-Transport-Security, and use secure cookies.
  config.force_ssl = true

  # Uptime monitors should get a straight 200 from /up, not a redirect.
  config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/up" } } }

  # Log to STDOUT by default
  config.logger = ActiveSupport::Logger.new(STDOUT)
    .tap  { |logger| logger.formatter = ::Logger::Formatter.new }
    .then { |logger| ActiveSupport::TaggedLogging.new(logger) }

  # Prepend all log lines with the following tags.
  config.log_tags = [ :request_id ]

  # "info" includes generic and useful information about system operation, but avoids logging too much
  # information to avoid inadvertent exposure of personally identifiable information (PII). If you
  # want to log everything, set the level to "debug".
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Use a different cache store in production.
  # config.cache_store = :mem_cache_store

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # DNS rebinding protection.
  config.hosts = [
    "braingency.eu",
    "www.braingency.eu"
  ]
  config.hosts << ENV["APP_HOST"] if ENV["APP_HOST"].present?

  # kamal-proxy health-checks the container directly, without a Host header we allow.
  config.host_authorization = { exclude: ->(request) { request.path == "/up" } }

end
