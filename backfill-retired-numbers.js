// Run: node backfill-retired-numbers.js
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://wnvbncbyrhbkbburzvzy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Retired numbers by team abbreviation
const RETIRED = {
  // === NBA ===
  'ATL': [
    { number: '9', player_name: 'Bob Pettit', years_active: '1954-1965' },
    { number: '21', player_name: 'Dominique Wilkins', years_active: '1982-1994' },
    { number: '23', player_name: 'Lou Hudson', years_active: '1966-1977' },
    { number: '44', player_name: 'Pete Maravich', years_active: '1970-1974' },
  ],
  'BOS': [
    { number: '1', player_name: 'Walter Brown', years_active: 'Founder' },
    { number: '2', player_name: 'Red Auerbach', years_active: 'Coach/GM' },
    { number: '3', player_name: 'Dennis Johnson', years_active: '1983-1990' },
    { number: '5', player_name: 'Kevin Garnett', years_active: '2007-2013' },
    { number: '6', player_name: 'Bill Russell', years_active: '1956-1969' },
    { number: '10', player_name: 'Jo Jo White', years_active: '1969-1979' },
    { number: '14', player_name: 'Bob Cousy', years_active: '1950-1963' },
    { number: '15', player_name: 'Tom Heinsohn', years_active: '1956-1965' },
    { number: '16', player_name: 'Tom Sanders', years_active: '1960-1973' },
    { number: '17', player_name: 'John Havlicek', years_active: '1962-1978' },
    { number: '18', player_name: 'Dave Cowens', years_active: '1970-1980' },
    { number: '19', player_name: 'Don Nelson', years_active: '1965-1976' },
    { number: '21', player_name: 'Bill Sharman', years_active: '1951-1961' },
    { number: '22', player_name: 'Ed Macauley', years_active: '1950-1956' },
    { number: '23', player_name: 'Frank Ramsey', years_active: '1954-1964' },
    { number: '24', player_name: 'Sam Jones', years_active: '1957-1969' },
    { number: '25', player_name: 'K.C. Jones', years_active: '1958-1967' },
    { number: '31', player_name: 'Cedric Maxwell', years_active: '1977-1985' },
    { number: '32', player_name: 'Kevin McHale', years_active: '1980-1993' },
    { number: '33', player_name: 'Larry Bird', years_active: '1979-1992' },
    { number: '34', player_name: 'Paul Pierce', years_active: '1998-2013' },
    { number: '35', player_name: 'Reggie Lewis', years_active: '1987-1993' },
    { number: 'LOSCY', player_name: 'Jim Loscutoff', years_active: '1955-1964' },
  ],
  'BKN': [
    { number: '3', player_name: 'Drazen Petrovic', years_active: '1991-1993' },
    { number: '5', player_name: 'Jason Kidd', years_active: '2001-2008' },
    { number: '25', player_name: 'Bill Melchionni', years_active: '1969-1976' },
    { number: '32', player_name: 'Julius Erving', years_active: '1973-1976' },
    { number: '52', player_name: 'Buck Williams', years_active: '1981-1989' },
  ],
  'CHA': [
    { number: '13', player_name: 'Bobby Phills', years_active: '1997-2000' },
  ],
  'CHI': [
    { number: '4', player_name: 'Jerry Sloan', years_active: '1966-1976' },
    { number: '10', player_name: 'Bob Love', years_active: '1968-1976' },
    { number: '23', player_name: 'Michael Jordan', years_active: '1984-1998' },
    { number: '33', player_name: 'Scottie Pippen', years_active: '1987-1998, 2003-2004' },
    { number: '34', player_name: 'Chet Walker', years_active: '1962-1969' },
    { number: '91', player_name: 'Dennis Rodman', years_active: '1995-1998' },
  ],
  'CLE': [
    { number: '7', player_name: 'Bingo Smith', years_active: '1970-1979' },
    { number: '11', player_name: 'Zydrunas Ilgauskas', years_active: '1997-2010' },
    { number: '22', player_name: 'Larry Nance Sr.', years_active: '1988-1994' },
    { number: '25', player_name: 'Mark Price', years_active: '1986-1995' },
    { number: '34', player_name: 'Austin Carr', years_active: '1971-1980' },
    { number: '42', player_name: 'Nate Thurmond', years_active: '1975-1977' },
    { number: '43', player_name: 'Brad Daugherty', years_active: '1986-1994' },
  ],
  'DAL': [
    { number: '12', player_name: 'Derek Harper', years_active: '1983-1994, 1996-1997' },
    { number: '15', player_name: 'Brad Davis', years_active: '1980-1992' },
    { number: '22', player_name: 'Rolando Blackman', years_active: '1981-1992' },
    { number: '41', player_name: 'Dirk Nowitzki', years_active: '1998-2019' },
  ],
  'DEN': [
    { number: '2', player_name: 'Alex English', years_active: '1980-1990' },
    { number: '33', player_name: 'David Thompson', years_active: '1975-1982' },
    { number: '40', player_name: 'Byron Beck', years_active: '1967-1977' },
    { number: '44', player_name: 'Dan Issel', years_active: '1975-1985' },
    { number: '55', player_name: 'Dikembe Mutombo', years_active: '1991-1996' },
    { number: '432', player_name: 'Fat Lever', years_active: '1984-1990' },
    { number: '15', player_name: 'Carmelo Anthony', years_active: '2003-2011' },
  ],
  'DET': [
    { number: '1', player_name: 'Chauncey Billups', years_active: '2002-2008, 2013-2014' },
    { number: '2', player_name: 'Chuck Daly', years_active: 'Coach 1983-1992' },
    { number: '3', player_name: 'Ben Wallace', years_active: '2000-2006, 2009-2012' },
    { number: '4', player_name: 'Joe Dumars', years_active: '1985-1999' },
    { number: '10', player_name: 'Dennis Rodman', years_active: '1986-1993' },
    { number: '11', player_name: 'Isiah Thomas', years_active: '1981-1994' },
    { number: '15', player_name: 'Vinnie Johnson', years_active: '1981-1991' },
    { number: '16', player_name: 'Bob Lanier', years_active: '1970-1980' },
    { number: '21', player_name: 'Dave Bing', years_active: '1966-1975' },
    { number: '32', player_name: 'Richard Hamilton', years_active: '2002-2011' },
    { number: '40', player_name: 'Bill Laimbeer', years_active: '1982-1993' },
  ],
  'GSW': [
    { number: '13', player_name: 'Wilt Chamberlain', years_active: '1959-1965' },
    { number: '14', player_name: 'Tom Meschery', years_active: '1961-1967' },
    { number: '16', player_name: 'Al Attles', years_active: '1960-1971' },
    { number: '17', player_name: 'Chris Mullin', years_active: '1985-1997, 2000-2001' },
    { number: '24', player_name: 'Rick Barry', years_active: '1965-1967, 1972-1978' },
    { number: '42', player_name: 'Nate Thurmond', years_active: '1963-1974' },
  ],
  'HOU': [
    { number: '22', player_name: 'Clyde Drexler', years_active: '1995-1998' },
    { number: '23', player_name: 'Calvin Murphy', years_active: '1970-1983' },
    { number: '24', player_name: 'Moses Malone', years_active: '1976-1982' },
    { number: '34', player_name: 'Hakeem Olajuwon', years_active: '1984-2001' },
    { number: '45', player_name: 'Rudy Tomjanovich', years_active: '1970-1981' },
    { number: '13', player_name: 'James Harden', years_active: '2012-2021' },
  ],
  'IND': [
    { number: '30', player_name: 'George McGinnis', years_active: '1971-1975, 1980-1982' },
    { number: '31', player_name: 'Reggie Miller', years_active: '1987-2005' },
    { number: '34', player_name: 'Mel Daniels', years_active: '1968-1974' },
    { number: '35', player_name: 'Roger Brown', years_active: '1967-1975' },
    { number: '529', player_name: 'Bob Netolicky', years_active: '1967-1973' },
  ],
  'LAC': [
    { number: '32', player_name: 'Blake Griffin', years_active: '2010-2018' },
    { number: '3', player_name: 'Chris Paul', years_active: '2011-2017' },
  ],
  'LAL': [
    { number: '13', player_name: 'Wilt Chamberlain', years_active: '1968-1973' },
    { number: '22', player_name: 'Elgin Baylor', years_active: '1958-1971' },
    { number: '24', player_name: 'Kobe Bryant', years_active: '1996-2016' },
    { number: '8', player_name: 'Kobe Bryant', years_active: '1996-2016' },
    { number: '25', player_name: 'Gail Goodrich', years_active: '1965-1968, 1970-1976' },
    { number: '32', player_name: 'Magic Johnson', years_active: '1979-1991, 1996' },
    { number: '33', player_name: 'Kareem Abdul-Jabbar', years_active: '1975-1989' },
    { number: '34', player_name: 'Shaquille O\'Neal', years_active: '1996-2004' },
    { number: '42', player_name: 'James Worthy', years_active: '1982-1994' },
    { number: '44', player_name: 'Jerry West', years_active: '1960-1974' },
    { number: '52', player_name: 'Jamaal Wilkes', years_active: '1977-1985' },
    { number: '16', player_name: 'Pau Gasol', years_active: '2008-2014' },
  ],
  'MEM': [
    { number: '50', player_name: 'Zach Randolph', years_active: '2009-2017' },
    { number: '11', player_name: 'Mike Conley', years_active: '2007-2019' },
    { number: '33', player_name: 'Marc Gasol', years_active: '2008-2019' },
    { number: '9', player_name: 'Tony Allen', years_active: '2010-2017' },
  ],
  'MIA': [
    { number: '1', player_name: 'Chris Bosh', years_active: '2010-2016' },
    { number: '3', player_name: 'Dwyane Wade', years_active: '2003-2016, 2018-2019' },
    { number: '10', player_name: 'Tim Hardaway', years_active: '1996-2001' },
    { number: '23', player_name: 'Michael Jordan', years_active: 'League-wide' },
    { number: '32', player_name: 'Shaquille O\'Neal', years_active: '2004-2008' },
    { number: '33', player_name: 'Alonzo Mourning', years_active: '1995-2002, 2005-2008' },
    { number: '6', player_name: 'LeBron James', years_active: '2010-2014' },
  ],
  'MIL': [
    { number: '1', player_name: 'Oscar Robertson', years_active: '1970-1974' },
    { number: '4', player_name: 'Sidney Moncrief', years_active: '1979-1989' },
    { number: '14', player_name: 'Jon McGlocklin', years_active: '1968-1976' },
    { number: '16', player_name: 'Bob Lanier', years_active: '1980-1984' },
    { number: '32', player_name: 'Brian Winters', years_active: '1974-1983' },
    { number: '33', player_name: 'Kareem Abdul-Jabbar', years_active: '1969-1975' },
    { number: '34', player_name: 'Ray Allen', years_active: '1996-2003' },
  ],
  'MIN': [
    { number: '2', player_name: 'Malik Sealy', years_active: '1999-2000' },
    { number: '21', player_name: 'Kevin Garnett', years_active: '1995-2007, 2015-2016' },
  ],
  'NOP': [
    { number: '7', player_name: 'Pete Maravich', years_active: '1974-1980' },
  ],
  'NYK': [
    { number: '10', player_name: 'Walt Frazier', years_active: '1967-1977' },
    { number: '12', player_name: 'Dick Barnett', years_active: '1965-1974' },
    { number: '15', player_name: 'Earl Monroe', years_active: '1971-1980' },
    { number: '15', player_name: 'Dick McGuire', years_active: '1949-1957' },
    { number: '19', player_name: 'Willis Reed', years_active: '1964-1974' },
    { number: '22', player_name: 'Dave DeBusschere', years_active: '1968-1974' },
    { number: '24', player_name: 'Bill Bradley', years_active: '1967-1977' },
    { number: '33', player_name: 'Patrick Ewing', years_active: '1985-2000' },
    { number: '613', player_name: 'Red Holzman', years_active: 'Coach' },
  ],
  'OKC': [
    { number: '0', player_name: 'Russell Westbrook', years_active: '2008-2019' },
    { number: '35', player_name: 'Kevin Durant', years_active: '2007-2016' },
    { number: '12', player_name: 'Steven Adams', years_active: '2013-2020' },
  ],
  'ORL': [
    { number: '6', player_name: 'Fan (The Sixth Man)', years_active: '' },
    { number: '32', player_name: 'Shaquille O\'Neal', years_active: '1992-1996' },
    { number: '1', player_name: 'Penny Hardaway', years_active: '1993-1999' },
  ],
  'PHI': [
    { number: '3', player_name: 'Allen Iverson', years_active: '1996-2006, 2009-2010' },
    { number: '6', player_name: 'Julius Erving', years_active: '1976-1987' },
    { number: '10', player_name: 'Mo Cheeks', years_active: '1978-1989' },
    { number: '13', player_name: 'Wilt Chamberlain', years_active: '1965-1968' },
    { number: '15', player_name: 'Hal Greer', years_active: '1958-1973' },
    { number: '24', player_name: 'Bobby Jones', years_active: '1978-1986' },
    { number: '32', player_name: 'Billy Cunningham', years_active: '1965-1976' },
    { number: '34', player_name: 'Charles Barkley', years_active: '1984-1992' },
  ],
  'PHX': [
    { number: '5', player_name: 'Dick Van Arsdale', years_active: '1968-1977' },
    { number: '6', player_name: 'Walter Davis', years_active: '1977-1988' },
    { number: '7', player_name: 'Kevin Johnson', years_active: '1988-2000' },
    { number: '9', player_name: 'Dan Majerle', years_active: '1988-1995, 2001-2002' },
    { number: '24', player_name: 'Tom Chambers', years_active: '1988-1993' },
    { number: '33', player_name: 'Alvan Adams', years_active: '1975-1988' },
    { number: '34', player_name: 'Charles Barkley', years_active: '1992-1996' },
    { number: '42', player_name: 'Connie Hawkins', years_active: '1969-1973' },
    { number: '44', player_name: 'Paul Westphal', years_active: '1975-1980, 1983-1984' },
  ],
  'POR': [
    { number: '1', player_name: 'Larry Weinberg', years_active: 'Owner' },
    { number: '13', player_name: 'Dave Twardzik', years_active: '1974-1980' },
    { number: '15', player_name: 'Larry Steele', years_active: '1971-1980' },
    { number: '20', player_name: 'Maurice Lucas', years_active: '1976-1980, 1987-1988' },
    { number: '22', player_name: 'Clyde Drexler', years_active: '1983-1995' },
    { number: '30', player_name: 'Bob Gross', years_active: '1975-1982' },
    { number: '30', player_name: 'Terry Porter', years_active: '1985-1995' },
    { number: '32', player_name: 'Bill Walton', years_active: '1974-1978' },
    { number: '36', player_name: 'Lloyd Neal', years_active: '1972-1979' },
    { number: '45', player_name: 'Geoff Petrie', years_active: '1970-1976' },
    { number: '77', player_name: 'Jack Ramsay', years_active: 'Coach 1976-1986' },
    { number: '0', player_name: 'Damian Lillard', years_active: '2012-2023' },
  ],
  'SAC': [
    { number: '1', player_name: 'Nate Archibald', years_active: '1970-1976' },
    { number: '2', player_name: 'Mitch Richmond', years_active: '1991-1998' },
    { number: '4', player_name: 'Chris Webber', years_active: '1998-2005' },
    { number: '6', player_name: 'Fan (The Sixth Man)', years_active: '' },
    { number: '11', player_name: 'Mike Bibby', years_active: '2001-2008' },
    { number: '16', player_name: 'Peja Stojakovic', years_active: '1999-2006' },
    { number: '21', player_name: 'Vlade Divac', years_active: '1999-2005' },
  ],
  'SAS': [
    { number: '0', player_name: 'Johnny Moore', years_active: '1980-1990' },
    { number: '6', player_name: 'Avery Johnson', years_active: '1994-2001, 2003' },
    { number: '9', player_name: 'Tony Parker', years_active: '2001-2018' },
    { number: '12', player_name: 'Bruce Bowen', years_active: '2001-2009' },
    { number: '13', player_name: 'James Silas', years_active: '1972-1981' },
    { number: '20', player_name: 'Manu Ginobili', years_active: '2002-2018' },
    { number: '21', player_name: 'Tim Duncan', years_active: '1997-2016' },
    { number: '32', player_name: 'Sean Elliott', years_active: '1989-1993, 1994-2001' },
    { number: '44', player_name: 'George Gervin', years_active: '1974-1985' },
    { number: '50', player_name: 'David Robinson', years_active: '1989-2003' },
  ],
  'TOR': [
    { number: '10', player_name: 'DeMar DeRozan', years_active: '2009-2018' },
    { number: '7', player_name: 'Kyle Lowry', years_active: '2012-2021' },
  ],
  'UTA': [
    { number: '1', player_name: 'Frank Layden', years_active: 'Coach 1981-1988' },
    { number: '4', player_name: 'Adrian Dantley', years_active: '1979-1986' },
    { number: '7', player_name: 'Pete Maravich', years_active: '1974-1980' },
    { number: '12', player_name: 'John Stockton', years_active: '1984-2003' },
    { number: '14', player_name: 'Jeff Hornacek', years_active: '1994-2000' },
    { number: '32', player_name: 'Karl Malone', years_active: '1985-2003' },
    { number: '35', player_name: 'Darrell Griffith', years_active: '1980-1991' },
    { number: '53', player_name: 'Mark Eaton', years_active: '1982-1993' },
  ],
  'WAS': [
    { number: '11', player_name: 'Elvin Hayes', years_active: '1972-1981' },
    { number: '25', player_name: 'Gus Johnson', years_active: '1963-1972' },
    { number: '41', player_name: 'Wes Unseld', years_active: '1968-1981' },
  ],
}

async function main() {
  // Create table if needed
  console.log('Creating retired_numbers table if not exists...')
  // Table creation should be done in Supabase SQL editor first
  
  // Look up team IDs
  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('id,team_abbr,sport')
    .eq('active', true)
  
  if (tErr) { console.log('Error fetching teams:', tErr.message); return }
  
  const teamMap = {}
  teams.forEach(t => { teamMap[t.team_abbr] = t.id })
  
  // Check if table exists by trying a select
  const { error: checkErr } = await supabase.from('retired_numbers').select('id').limit(1)
  if (checkErr) {
    console.log('retired_numbers table does not exist. Create it first:')
    console.log(`
CREATE TABLE retired_numbers (
  id serial PRIMARY KEY,
  team_id integer REFERENCES teams(id),
  number varchar(10),
  player_name varchar(255),
  years_active varchar(50),
  created_at timestamp DEFAULT now()
);
    `)
    return
  }
  
  let total = 0, inserted = 0, skipped = 0
  
  for (const [abbr, numbers] of Object.entries(RETIRED)) {
    const teamId = teamMap[abbr]
    if (!teamId) { console.log(`  Team ${abbr} not found, skipping`); skipped += numbers.length; continue }
    
    for (const n of numbers) {
      total++
      // Check if already exists
      const { data: existing } = await supabase
        .from('retired_numbers')
        .select('id')
        .eq('team_id', teamId)
        .eq('number', n.number)
        .eq('player_name', n.player_name)
        .limit(1)
      
      if (existing?.length) { skipped++; continue }
      
      const { error: insErr } = await supabase
        .from('retired_numbers')
        .insert({ team_id: teamId, number: n.number, player_name: n.player_name, years_active: n.years_active || null })
      
      if (insErr) { console.log(`  Error inserting ${abbr} #${n.number} ${n.player_name}: ${insErr.message}`) }
      else { inserted++ }
    }
    console.log(`  ${abbr}: ${numbers.length} numbers`)
  }
  
  console.log(`\nDone! Total: ${total}, Inserted: ${inserted}, Skipped: ${skipped}`)
}

main().catch(console.error)
