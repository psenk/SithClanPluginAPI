-- Main Database Tables

-- Event Schedule table
DROP TABLE IF EXISTS EventSchedule;
CREATE TABLE IF NOT EXISTS EventSchedule 
(
    EventId INT PRIMARY KEY, 
    EventSchedule TEXT NOT NULL
);

-- Testing Tables

-- Test Event Schedule Table
DROP TABLE IF EXISTS TestEventSchedule;
CREATE TABLE IF NOT EXISTS TestEventSchedule 
(
    EventId INT PRIMARY KEY, 
    EventSchedule TEXT NOT NULL
);
INSERT INTO TestEventSchedule (EventId, EventSchedule) 
VALUES (1, '[{"eventDate": "1/1/2026", "events": [{"eventTitle": "Mahogany Homes","eventTime": "12:00 PM","eventHost": "Sasa254","eventLocation": ":earth_americas: W491",
"eventRepeated": true}]},{"eventDate": "1/2/2026","events":[{"eventTitle": "Star Mining","eventTime": "1:00 PM","eventHost": "HouseWaifuu","eventLocation": ":earth_americas: W491",
"eventRepeated": true},{"eventTitle": "Funny Hat Raid","eventTime": "8:00 PM","eventHost": "big unhappy","eventLocation": ":earth_americas: W491","eventRepeated": true
}]},{"eventDate": "1/3/2026","events": []},{"eventDate": "1/4/2026","events":[{"eventTitle": "Ardougne Bank Skilling! :Coinstack:","eventTime": "8:00 PM","eventLocation": ":earth_americas: W491",
"eventRepeated": true},{"eventTitle": "Clan Meeting! :Redsaber: ","eventTime": "9:30 PM","eventMiscInfo": ["Clan Hall"],"eventLocation": ":earth_americas: W491","eventRepeated": true
}]},{"eventDate": "1/5/2026","events":[{"eventTitle": "Cookies Credit Carnival","eventTime": "9:00 PM","eventHost": "Cookies","eventLocation": ":earth_americas: W491",
"eventRepeated": true}]},{"eventDate": "1/6/2026","events": [{"eventTitle": "Zalcano","eventTime": "3:00 PM","eventHost": "snowyFE","eventLocation": ":earth_americas: W491",
"eventRepeated": true},{"eventTitle": "Callisto","eventTime": "8:00 PM","eventHost": "Boomerdude03","eventLocation": ":earth_americas: W491","eventRepeated: false}]
},{"eventDate": "1/7/2026","events": [{"eventTitle": "Corp :dog:","eventTime": "12:00 AM","eventMiscInfo": ["MIN REQS: Z spear DWH/ BGS/ Arclight","Read rules in #🍻︱sith-creed"
],"eventLocation": ":earth_americas: W491","eventRepeated": true},{"eventTitle": "Guardian''s of the Rift","eventTime": "11:00 AM","eventHost": "snowyFE","eventLocation": ":earth_americas: W491",
"eventRepeated": true},{"eventTitle": "Corp Corp :dog::dog:","eventTime": "4:00 PM","eventMiscInfo": ["MIN REQS: Z spear DWH/ BGS/ Arclight","Read rules in #🍻︱sith-creed"],
"eventLocation": ":earth_americas: W491","eventRepeated": true},{"eventTitle": "Corp Corp Corp :dog: :dog: :dog:","eventTime": "9:00 PM","eventMiscInfo": [
"MIN REQS: Z spear DWH/ BGS/ Arclight","Read rules in #🍻︱sith-creed"],"eventLocation": ":earth_americas: W491","eventRepeated": true}]}]');