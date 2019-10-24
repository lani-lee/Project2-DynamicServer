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
// pulling images fro here: https://www.pexels.com

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
        var coalTotal       = 0;
        var naturalGasTotal = 0;
        var nuclearTotal    = 0;
        var petroleumTotal  = 0;
        var renewableTotal  = 0;
        var tableString= "";
        db.each("SELECT * FROM Consumption WHERE year = 2017 ORDER BY year", (err, row)=> {
            tableString = tableString + "<tr>"+"<td>"+row.state_abbreviation +"</td>"+"<td>"+row.coal+"</td>"
            +"<td>"+row.natural_gas+"</td>"+"<td>"+row.nuclear+"</td>"+"<td>"+row.petroleum+"</td>"+"<td>"
            +row.renewable+"</td>"+"</tr>"+"\n";
            naturalGasTotal = naturalGasTotal+row.natural_gas;
            nuclearTotal    = nuclearTotal+row.nuclear;
            petroleumTotal  = petroleumTotal+row.petroleum;
            renewableTotal  = renewableTotal+row.renewable;
            coalTotal       = coalTotal + row.coal;
        }, () => {
            var coalString = "var coal_count =" + coalTotal;
            var naturalGasString = "var natural_gas_count = " + naturalGasTotal;
            var nuclearString = "var nuclear_count = " + nuclearTotal;
            var petroleumString = "var petroleum_count = " + petroleumTotal;
            var renewableString = "var renewable_count = " + renewableTotal;

            response = response.replace("var coal_count", coalString);
            response = response.replace("var natural_gas_count", naturalGasString);
            response = response.replace("var nuclear_count",nuclearString);
            response = response.replace("var petroleum_count", petroleumString);
            response = response.replace("var renewable_count", renewableString);
            response = response.replace("<!-- Data to be inserted here -->", tableString);


            WriteHtml(res, response);
        });
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
        db.each("SELECT * FROM Consumption WHERE year = ? ORDER BY year",[req.params.selected_year], (err, row)=>{
            //console.log(rows);
            var tableTotalForStateRow = row.coal+row.natural_gas+row.nuclear+row.petroleum+row.renewable;
            tableString = tableString + "<tr>"+"<td>"+row.state_abbreviation +"</td>"+"<td>"+row.coal+"</td>"+"<td>"
            +row.natural_gas+"</td>"+"<td>"+row.nuclear+"</td>"+"<td>"+row.petroleum+"</td>"+"<td>"+row.renewable
            +"</td>"+"<td>"+tableTotalForStateRow+"</td>"+"</tr>"+"\n";
            naturalGasTotal = naturalGasTotal+row.natural_gas;
            nuclearTotal    = nuclearTotal+row.nuclear;
            petroleumTotal  = petroleumTotal+row.petroleum;
            renewableTotal  = renewableTotal+row.renewable;
            coalTotal       = coalTotal + row.coal;
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
		var state = req.params.selected_state;
        // modify `response` here

		db.get("SELECT * FROM States WHERE state_abbreviation=?",[state], (err,row) => {
			var fullStateName = row.state_name;
			// replacing the title and h2 header with the abbreviated and full state name
			var titleString = "<title>" + state + " Energy Consumption</title>";
			response = response.replace("<title>US Energy Consumption</title>", titleString);
			var h2String =  "<h2>" + fullStateName + " Yearly Snapshot</h2>"
			response = response.replace("<h2>Yearly Snapshot</h2>", h2String);
			// linking the prev and next state buttons
			var states = ['AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 
						  'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME',
						  'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 
						  'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 
						  'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'];
			var prevLink;
			var nextLink;
			if(state == "AK") {
				prevLink = "WY";
				nextLink = "AL";
			}
			else if (state == "WY") {
				prevLink = "WV";
				nextLink = "AK";
			}
			else {
				prevLink = states[states.indexOf(state)-1];
				nextLink = states[states.indexOf(state)+1];
			}
			response = response.replace("<a class=\"prev_next\" href=\"\">XX</a> <!-- change XX to prev", "<a class=\"prev_next\" href=\"" + path.join(req.get('host'), "state", prevLink) + "\">" + prevLink + "</a> <!-- change XX to prev");
			response = response.replace("<a class=\"prev_next\" href=\"\">XX</a> <!-- change XX to next", "<a class=\"prev_next\" href=\"" + path.join(req.get('host'), "state", nextLink) + "\">" + nextLink + "</a> <!-- change XX to next");
		});
        
        // Replace image and alt

        // response = response.replace("<img src=\"/images/noimage.jpg\" alt=\"No Image\"", "<img src=\"/images/" + state + ".jpg" + "\" alt=\"Flag of " + state + "\"");
        response = response.replace("<img src=\"/images/noimage.jpg\" alt=\"No Image\"", "<img src=\"" + path.join("a", "images", state + ".jpg").substring(1) + "\" alt=\"Flag of " + state + "\"");
        
        
        var tableString = "";
		// Getting data from database
        // Building arrays of consumption per year for each resource type
        var stateOBJ = {coal:[],natural_gas:[],nuclear:[],petroleum:[],renewable:[], totalCountRow:[]};
        var yearForTableString = 1960;
		db.each("SELECT * FROM Consumption WHERE state_abbreviation=? ORDER BY Year", [state], (err, row) => {
            stateOBJ['coal'].push(row.coal);
            stateOBJ['natural_gas'].push(row.natural_gas);
            stateOBJ['nuclear'].push(row.nuclear);
            stateOBJ['petroleum'].push(row.petroleum);
            stateOBJ['renewable'].push(row.renewable);
            var totalCountRow = row.coal + row.natural_gas + row.nuclear + row.petroleum + row.renewable
            stateOBJ['totalCountRow'].push(totalCountRow);
            tableString = tableString + "<tr>" + "<td>" + yearForTableString + "</td>" + "<td>" + row.coal + "</td>"
            + "<td>" + row.natural_gas + "</td>" + "<td>" + row.nuclear+"</td>" + "<td>" + row.petroleum + "</td>"
            + "<td>" + row.renewable + "</td>" + "<td>"+totalCountRow+"</td>" + "</tr>"+"\n";

            yearForTableString = yearForTableString + 1; 
		}, () => {
        
        var stateString = "var state = " +"\""+ state+"\"";
        var coalString = "var coal_counts = " + JSON.stringify(stateOBJ['coal']);
		var naturalGasString = "var natural_gas_counts = " + JSON.stringify(stateOBJ['natural_gas']);
		var nuclearString = "var nuclear_counts = " + JSON.stringify(stateOBJ['nuclear']);
		var petroleumString = "var petroleum_counts = " + JSON.stringify(stateOBJ['petroleum']);
		var renewableString = "var renewable_counts = " + JSON.stringify(stateOBJ['renewable']);
        console.log(naturalGasString);
        response = response.replace("var state", stateString);
        response = response.replace("var coal_counts", coalString);
		response = response.replace("var natural_gas_count", naturalGasString);
		response = response.replace("var nuclear_counts", nuclearString);
		response = response.replace("var petroleum_counts", petroleumString);
		response = response.replace("var renewable_counts", renewableString);
        response = response.replace("<!-- Data to be inserted here -->", tableString);
		
		WriteHtml(res, response);		
		});
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
        let response = template;
        var energyType = req.params.selected_energy_type;
        //console.log(req.params);
        //console.log(req.params.selected_energy_type);
        var jsonPerState={AK:[], AL:[], AR:[], AZ:[], CA:[], CO:[], CT:[], 
            DC:[], DE:[], FL:[], GA:[], HI:[], IA:[], ID:[], IL:[], IN:[], 
            KS:[], KY:[], LA:[], MA:[], MD:[], ME:[], MI:[], MN:[], MO:[],
            MS:[], MT:[], NC:[], ND:[], NE:[], NH:[], NJ:[], NM:[], NV:[],
            NY:[], OH:[], OK:[], OR:[], PA:[], RI:[], SC:[], SD:[], TN:[],
            TX:[], UT:[], VA:[], VT:[], WA:[], WI:[], WV:[], WY:[]};
        db.each("SELECT * FROM Consumption ORDER BY year", (err,row)=>{
            //console.log(rows.year, rows.state_abbreviation, rows[req.params.selected_energy_type]);
            jsonPerState[row.state_abbreviation].push(row[req.params.selected_energy_type]);
        }, () => {
            //console.log(jsonPerState);
            if(energyType=="natural_gas"){
                var energyTypeSplit = energyType.split("_");
                energyTypeSplit[0] = energyTypeSplit[0].charAt(0).toUpperCase() + energyTypeSplit[0].slice(1);
                energyTypeSplit[1] = energyTypeSplit[1].charAt(0).toUpperCase() + energyTypeSplit[1].slice(1); 
                capitalizedEnergyType = energyTypeSplit[0] + " " + energyTypeSplit[1];    
            }else{
                capitalizedEnergyType = energyType.charAt(0).toUpperCase() +energyType.slice(1);
            }
            var energyTypeString = "var energy_type = "+"\"" +capitalizedEnergyType + "\"";
            var energyCountsString = "var energy_counts = " + JSON.stringify(jsonPerState);
            //console.log("selected energy type: "+energyType);
            // Handling capitalization of the energy type
            var capitalizedEnergyType
            var consumptionSnapshotString = "<h2>"+capitalizedEnergyType+" "+"Consumption Snapshot</h2>";
            var titleEnergyTypeString = "<title>"+ "US" + " " + capitalizedEnergyType +" "+ "Energy Consumption" + "</title>"; 
            //console.log(energyCountsString);
            //console.log("ConsumptionString :"+consumptionSnapshotString,"titleEnergyString: "+titleEnergyTypeString);
            response = response.replace("var energy_type", energyTypeString);
            response = response.replace("var energy_counts", energyCountsString);
            response = response.replace("<title>US Energy Consumption</title>", titleEnergyTypeString);
            response = response.replace("<h2>Consumption Snapshot</h2>", consumptionSnapshotString);
            //console.log("Energy Type Check:" +energyType);
            //console.log("energyTypeString: "+energyTypeString)
            //console.log("Var jsonPerStateStringCheck: " + energyCountsString);
            
            //IMAGE Replacement
            response = response.replace("<img src=\"/images/noimage.jpg\" alt=\"No Image\"", "<img src=\"" + path.join("a", "images", energyType + ".jpg").substring(1) + "\" alt=\"Image of " + capitalizedEnergyType + "\"");
            //for the buttons, could have a dictionary or an array where it wraps around where it matches from the capitalizedEnergyType
            //use hoemwork one for the different types of content types as way to figure out
            
            // Building table of total usage of resource per year per state
            var tableString = "";
            var yearTotal = 0;
            for (var i = 0; i < jsonPerState.AK.length; i++) {
                let year = i + 1960;
                tableString += "<tr><td>" + year + "</td>";
                for (var state in jsonPerState) {
                    tableString += "<td>" + jsonPerState[state][i] + "</td>";
                    yearTotal += jsonPerState[state][i];
                }
                tableString += "<td>" + yearTotal + "</td></tr>\n";
                yearTotal = 0;
            }
            response = response.replace("<!-- Data to be inserted here -->", tableString);
            console.log(tableString);
            
            WriteHtml(res, response);

            });        
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
