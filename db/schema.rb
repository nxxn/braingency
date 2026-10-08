# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_10_09_090100) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "articles", force: :cascade do |t|
    t.string "slug", null: false
    t.date "published_on", null: false
    t.boolean "published", default: false, null: false
    t.string "title_en", null: false
    t.string "title_lv"
    t.text "excerpt_en"
    t.text "excerpt_lv"
    t.text "body_en"
    t.text "body_lv"
    t.string "meta_title_en"
    t.string "meta_title_lv"
    t.string "meta_description_en"
    t.string "meta_description_lv"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "title_ru"
    t.text "excerpt_ru"
    t.text "body_ru"
    t.string "meta_title_ru"
    t.string "meta_description_ru"
    t.string "template"
    t.index ["published", "published_on"], name: "index_articles_on_published_and_published_on"
    t.index ["slug"], name: "index_articles_on_slug", unique: true
  end

  create_table "poll_votes", force: :cascade do |t|
    t.bigint "article_id", null: false
    t.string "voter", null: false
    t.integer "choice", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["article_id", "voter"], name: "index_poll_votes_on_article_id_and_voter", unique: true
    t.index ["article_id"], name: "index_poll_votes_on_article_id"
  end

  add_foreign_key "poll_votes", "articles", on_delete: :cascade
end
