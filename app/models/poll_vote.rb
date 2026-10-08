# One reader's position in an interactive article's poll. The voter is an
# anonymous token from a signed cookie; voting again changes the vote.
class PollVote < ApplicationRecord
  belongs_to :article

  validates :voter, presence: true, uniqueness: { scope: :article_id }
  validates :choice, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :choice_within_poll

  private

  def choice_within_poll
    return if article.nil? || choice.nil?

    errors.add(:choice, :inclusion) unless choice < article.poll_options
  end
end
