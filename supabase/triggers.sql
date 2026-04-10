-- Handle new user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user ()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."users" ("id", "email", "created_at")
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.created_at, NOW())
  )
  ON CONFLICT ("id") DO NOTHING;

  INSERT INTO public."user_settings" ("user_id")
  VALUES (NEW.id)
  ON CONFLICT ("user_id") DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user ();


-- Handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_deleted ()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public."users" WHERE "id" = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deleted ();
