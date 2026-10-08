class CreatePollVotes < ActiveRecord::Migration[7.2]
  def change
    # Reader votes on an interactive article's poll. Anonymous: a voter is a
    # random token kept in a signed cookie, so one browser holds one vote and
    # can change it.
    create_table :poll_votes do |t|
      t.references :article, null: false, foreign_key: { on_delete: :cascade }
      t.string :voter, null: false
      t.integer :choice, null: false

      t.timestamps
    end

    add_index :poll_votes, [:article_id, :voter], unique: true
  end
end
