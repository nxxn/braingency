# The anonymous token that ties a browser to its poll votes.
module PollVoter
  extend ActiveSupport::Concern

  private

  def poll_voter_token = cookies.signed[:poll_voter]

  def poll_voter_token!
    poll_voter_token || SecureRandom.hex(16).tap do |token|
      cookies.signed.permanent[:poll_voter] = { value: token, httponly: true, same_site: :lax }
    end
  end
end
