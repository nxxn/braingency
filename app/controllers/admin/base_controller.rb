module Admin
  # One person edits a handful of articles, so HTTP Basic is enough; a user
  # model and sign-in pages would be more code than the editor itself.
  class BaseController < ApplicationController
    layout "admin"

    before_action :authenticate

    private

    def authenticate
      user = ENV["ADMIN_USER"].presence
      password = ENV["ADMIN_PASSWORD"].presence

      # Without credentials the admin stays shut rather than open to anyone.
      if user.nil? || password.nil?
        message = Rails.env.development? ? "Admin is closed: set ADMIN_USER and ADMIN_PASSWORD and restart the server." : "Forbidden"
        return render plain: message, status: :forbidden
      end

      authenticate_or_request_with_http_basic("Braingency admin") do |given_user, given_password|
        ActiveSupport::SecurityUtils.secure_compare(given_user, user) &
          ActiveSupport::SecurityUtils.secure_compare(given_password, password)
      end
    end

    # Admin routes sit outside the /:locale scope.
    def default_url_options = {}
  end
end
