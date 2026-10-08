# Reader votes on an interactive article's poll. No accounts: each browser
# gets an anonymous token in a signed cookie and holds one vote per article,
# which it can change. Answers with the updated tally as JSON.
class PollVotesController < ApplicationController
  include PollVoter

  rate_limit to: 20, within: 1.minute, only: :create,
             with: -> { render json: { error: "rate_limited" }, status: :too_many_requests }

  def create
    article = Article.published.find_by(slug: params[:slug])
    return head :not_found if article.nil? || article.poll_options.zero?

    vote = article.poll_votes.find_or_initialize_by(voter: poll_voter_token!)
    vote.choice = params[:choice]

    if vote.save
      render json: { counts: article.poll_counts, mine: vote.choice }
    else
      render json: { error: "invalid" }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotUnique
    # Two clicks raced to create the same voter's first vote; the other won.
    retry
  end
end
