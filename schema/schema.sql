-- Event Schedule table
-- Event object contains: event title, event time, event host, event misc info, event location, repeated
DROP TABLE IF EXISTS EventSchedule;
CREATE TABLE IF NOT EXISTS EventSchedule 
(EventId INTEGER PRIMARY KEY, EventDate TEXT, EventTitle TEXT, EventHost TEXT, EventMiscInfo TEXT, EventLocation TEXT, EventRepeated INT);
