-- Enable RLS
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;


ALTER TABLE cards ENABLE ROW LEVEL SECURITY;


ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;


ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;


-- Decks
CREATE POLICY "Users can CRUD own decks" ON decks FOR ALL USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);


-- Cards
CREATE POLICY "Users can CRUD own cards" ON cards FOR ALL USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);


-- User Settings
CREATE POLICY "Users can read own settings" ON user_settings FOR
SELECT
  USING (auth.uid () = user_id);


CREATE POLICY "Users can update own settings" ON user_settings
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);


-- Review Logs
CREATE POLICY "Users can insert own review logs" ON review_logs FOR INSERT
WITH
  CHECK (
    auth.uid () = (
      SELECT
        user_id
      FROM
        cards
      WHERE
        id = card_id
    )
  );


CREATE POLICY "Users can read own review logs" ON review_logs FOR
SELECT
  USING (
    auth.uid () = (
      SELECT
        user_id
      FROM
        cards
      WHERE
        id = card_id
    )
  );