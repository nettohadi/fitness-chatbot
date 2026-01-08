-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- Create calorie_entries table
CREATE TABLE IF NOT EXISTS calorie_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calories DECIMAL(10, 2) NOT NULL,
  food_description TEXT,
  estimated_by_ai BOOLEAN DEFAULT FALSE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_calorie_entries_user_date ON calorie_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_calorie_entries_created ON calorie_entries(created_at);

-- Create conversation_logs table (optional, for debugging)
CREATE TABLE IF NOT EXISTS conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  message_type VARCHAR(20),
  message_body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for conversation logs
CREATE INDEX IF NOT EXISTS idx_conversation_logs_phone ON conversation_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created ON conversation_logs(created_at);

-- Add Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE calorie_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for users table (allow service role full access)
CREATE POLICY "Enable read access for service role" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for service role" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for service role" ON users
  FOR UPDATE USING (true);

-- Create policies for calorie_entries table
CREATE POLICY "Enable read access for service role" ON calorie_entries
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for service role" ON calorie_entries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for service role" ON calorie_entries
  FOR UPDATE USING (true);

-- Create policies for conversation_logs table
CREATE POLICY "Enable read access for service role" ON conversation_logs
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for service role" ON conversation_logs
  FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
