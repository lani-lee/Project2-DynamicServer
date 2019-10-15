// Built-in Node.js modules
var fs = require('fs')
var path = require('path')

// NPM modules
var express = require('express')
var sqlite3 = require('sqlite3')


var public_dir = path.join(__dirname, 'public');
var template_dir = path.join(__dirname, 'templates');
var db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

var app = express();
var port = 8000;

// open usenergy.sqlite3 database
var db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
        //Testsql()
    }
});
// database command stuff to pull data
//SELECT column FROM table WHERE column <op> value ORDER BY column
//ex: SELECT * FROM Consumption WHERE state_abreviation = 'MN' ORDER BY year
//use database all not many callback functions, but could have individual ones
//.tables lists tables
//PRAGMA table_info(table_name) Lists columns for a table
//database wiki: https://github.com/mapbox/node-sqlite3/wiki/API#databaseallsql-param--callback

app.use(express.static(public_dir));
/*
function Testsql(){
    //db.all("SELECT * FROM Consumption", (err, rows) =>{
    // db.each("SELECT * FROM Consumption WHERE state_abbreviation = ? ORDER BY year",['MN'], (err, rows)=>{
        
    //     console.log(rows)
    // });

    db.each("SELECT * FROM Consumption WHERE year = ? ORDER BY year",['2014'], (err, rows)=>{
        console.log(rows)
    })
}
*/

// GET request handler for '/'
app.get('/', (req, res) => {
    ReadFile(path.join(template_dir, 'index.html')).then((template) => {
        let response = template;
        // modify `response` here
        WriteHtml(res, response);
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    ReadFile(path.join(template_dir, 'year.html')).then((template) => {
        let response = template;
        // modify `response` here
        //inject content for the year etc
        var coalTotal       = 0;
        var naturalGasTotal = 0;
        var nuclearTotal    = 0;
        var petroleumTotal  = 0;
        var renewableTotal  = 0;
        var tableString= "";
        db.each("SELECT * FROM Consumption WHERE year = ? ORDER BY year",[req.params.selected_year], (err, rows)=>{
            //console.log(rows);
            var tableTotalForStateRow = rows.coal+rows.natural_gas+rows.nuclear+rows.petroleum+rows.renewable;
            tableString = tableString + "<tr>"+"<td>"+rows.state_abbreviation +"</td>"+"<td>"+rows.coal+"</td>"+"<td>"+rows.natural_gas+"</td>"+"<td>"+rows.nuclear+"</td>"+"<td>"+rows.petroleum+"</td>"+"<td>"+rows.renewable+"</td>"+"<td>"+tableTotalForStateRow+"</td>"+"</tr>"+"\n";
            naturalGasTotal = naturalGasTotal+rows.natural_gas;
            nuclearTotal    = nuclearTotal+rows.nuclear;
            petroleumTotal  = petroleumTotal+rows.petroleum;
            renewableTotal  = renewableTotal+rows.renewable;
            coalTotal       = coalTotal + rows.coal;
            //console.log(rows.coal + " dis is the individual print")
        }, () => {
            //testing to make sure totals added correctly.
            // console.log(coalTotal + " coal total");
            // console.log(naturalGasTotal + " Natural Gas Total");
            // console.log(nuclearTotal + " nuclear total");
            // console.log(petroleumTotal + " petroleum total");
            // console.log(renewableTotal + " renewableTotal");
            var yearString = "var year = " + req.params.selected_year;
            var coalString = "var coal_count =" + coalTotal;
            var naturalGasString = "var natural_gas_count = " + naturalGasTotal;
            var nuclearString = "var nuclear_count = " + nuclearTotal;
            var petroleumString = "var petroleum_count = " + petroleumTotal;
            var renewableString = "var renewable_count = " + renewableTotal;
            var snapshotString = req.params.selected_year + " " +"National Snapshot"
            var titleString = "<title>"+req.params.selected_year + " " + "US Energy Consumption"+"</title";
            //Replacing the strings with the data totals
            response = response.replace("var year", yearString);
            response = response.replace("var coal_count", coalString);
            response = response.replace("var natural_gas_count", naturalGasString);
            response = response.replace("var nuclear_count",nuclearString);
            response = response.replace("var petroleum_count", petroleumString);
            response = response.replace("var renewable_count", renewableString);
            //Replacing the Header
            response = response.replace("National Snapshot", snapshotString);
            //Inserting the table.
            response = response.replace("<!-- Data to be inserted here -->", tableString);
            response = response.replace("<title>US Energy Consumption</title>",titleString);
            //Button Features
            var currYear = parseInt(req.params.selected_year);
            var prevYear = currYear - 1;
            var nextYear = currYear + 1;
            if (currYear == 1960) {
                prevYear = 1960;
            }
            else if (currYear == 2017) {
                nextYear = 2017;
            }
            response = response.replace("href=\"\">Prev", "href=\"" + path.join(req.get('host'), "year", prevYear.toString()) + "\">Prev")
            response = response.replace("href=\"\">Next", "href=\"" + path.join(req.get('host'), "year", nextYear.toString() ) + "\">Next")
            
            WriteHtml(res, response);
        });
        
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    ReadFile(path.join(template_dir, 'state.html')).then((template) => {
        let response = template;
        // modify `response` here

        // for Dynamically populate the <h2> header of the state.html template to include the full name (rather than abbreviation) of the specific state being viewed
            // could have a dictionary with the abbreviation as the key
        //inject content for per state, SQL query here????
        WriteHtml(res, response);
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
        let response = template;
        console.log(req.params);
        var jsonPerState={AK:[], AL:[], AR:[], AZ:[], CA:[], CO:[], CT:[], 
            DC:[], DE:[], FL:[], GA:[], HI:[], IA:[], ID:[], IL:[], IN:[], 
            KS:[], KY:[], LA:[], MA:[], MD:[], ME:[], MI:[], MN:[], MO:[],
            MS:[], MT:[], NC:[], ND:[], NE:[], NH:[], NJ:[], NM:[], NV:[],
            NY:[], OH:[], OK:[], OR:[], PA:[], RI:[], SC:[], SD:[], TN:[],
            TX:[], UT:[], VA:[], VT:[], WA:[], WI:[], WV:[], WY:[]};
         db.each("SELECT * FROM Consumption ORDER BY year", (err,rows)=>{
             console.log(rows.year, rows.state_abbreviation, rows[req.params.selected_energy_type]);
             jsonPerState[rows.state_abbreviation].push(rows[req.params.selected_energy_type]);
             

            // var newEntry = {year: (year from that row), energyNumber: (number from that year)}
        // var newEntryState = rows.state_abbreviation;
        // Creates the new entry for the entry the state: jsonPerState [newEntryState] = newEntry;
         }, () =>{
             console.log(jsonPerState);
                 var consumptionSnapshotString = "<h2>"+req.params.selected_energy_type+" "+"Consumption Snapshot</h2>";
            //     //var titleYearString = "<title>"+    
                response.replace("<title>US Energy Consumption</title> <!-- change title to include year (e.g. 1999 US Energy Consumption) -->",)
                 response.replace("<h2>Consumption Snapshot</h2> <!-- change header to include energy type (e.g. Coal Consumption Snaphot) -->",consumptionSnapshotString);
             });        
            //{ak: [7189, each one for year per state etc], AL:[]}

        // modify `response` here
        WriteHtml(res, response);
    }).catch((err) => {
        Write404Error(res);
    });
});

function ReadFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data.toString());
            }
        });
    });
}

function Write404Error(res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('Error: file not found');
    res.end();
}

function WriteHtml(res, html) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(html);
    res.end();
}


var server = app.listen(port);
