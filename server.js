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
    }
});


app.use(express.static(public_dir));

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
        //Adds the next row to the running total and builds table string 
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
            //setting variables equal to total for replacement
            var coalString = "var coal_count = " + coalTotal;
            var naturalGasString = "var natural_gas_count = " + naturalGasTotal;
            var nuclearString = "var nuclear_count = " + nuclearTotal;
            var petroleumString = "var petroleum_count = " + petroleumTotal;
            var renewableString = "var renewable_count = " + renewableTotal;
            //replacing the variables in the HTML document with the data strings.
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
    var year = req.params.selected_year;
    // Writes 404 error page if selected year is not between 1960 and 2017, inclusive
    if (year < 1960 || year > 2017) {
        //bad year
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.write('Error: no data for year ' + year);
        res.end();
    }else{
        //year is ok
        ReadFile(path.join(template_dir, 'year.html')).then((template) => {
            let response = template;
            // modify `response` here
    
            var coalTotal       = 0;
            var naturalGasTotal = 0;
            var nuclearTotal    = 0;
            var petroleumTotal  = 0;
            var renewableTotal  = 0;
            var tableString= "";
            db.each("SELECT * FROM Consumption WHERE year = ? ORDER BY year", [year], (err, row)=>{
               //Adds the next row to the running total and builds table string 
                var tableTotalForStateRow = row.coal+row.natural_gas+row.nuclear+row.petroleum+row.renewable;
                tableString = tableString + "<tr>"+"<td>"+row.state_abbreviation +"</td>"+"<td>"+row.coal+"</td>"+"<td>"
                +row.natural_gas+"</td>"+"<td>"+row.nuclear+"</td>"+"<td>"+row.petroleum+"</td>"+"<td>"+row.renewable
                +"</td>"+"<td>"+tableTotalForStateRow+"</td>"+"</tr>"+"\n";
                naturalGasTotal = naturalGasTotal+row.natural_gas;
                nuclearTotal    = nuclearTotal+row.nuclear;
                petroleumTotal  = petroleumTotal+row.petroleum;
                renewableTotal  = renewableTotal+row.renewable;
                coalTotal       = coalTotal + row.coal;
            }, () => {
                //setting variables equal to total for replacement
                var yearString = "var year = " + year;
                var coalString = "var coal_count = " + coalTotal;
                var naturalGasString = "var natural_gas_count = " + naturalGasTotal;
                var nuclearString = "var nuclear_count = " + nuclearTotal;
                var petroleumString = "var petroleum_count = " + petroleumTotal;
                var renewableString = "var renewable_count = " + renewableTotal;
                var snapshotString = year + " " +"National Snapshot"
                var titleString = "<title>"+ year + " " + "US Energy Consumption"+"</title>";
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
                var currYear = parseInt(year);
                var prevYear = currYear - 1;
                var nextYear = currYear + 1;
                if (currYear == 1960) {
                    prevYear = 1960;
                }
                else if (currYear == 2017) {
                    nextYear = 2017;
                }
                var previousYearButton = "href=\"/year/" + prevYear + "\">"+prevYear;
                var nextYearButton = "href=\"/year/" + nextYear + "\">"+nextYear
                response = response.replace("href=\"\">Prev", previousYearButton);
                response = response.replace("href=\"\">Next", nextYearButton);
                
                WriteHtml(res, response);
            });
            
        }).catch((err) => {
            Write404Error(res);
        });
    }
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    var state = req.params.selected_state;
    var states = ['AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 
						  'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME',
						  'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 
						  'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 
						  'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'];
    // Writes 404 error page if selected state is not a valid state
    if (states.indexOf(state) < 0) {
        //State not in the list
        console.log('could not find ' + state);
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.write('Error: no data for state ' + state);
        res.end();
    }else{
        //State found in the list
        ReadFile(path.join(template_dir, 'state.html')).then((template) => {
            let response = template;

            db.get("SELECT * FROM States WHERE state_abbreviation=?",[state], (err,row) => {
                var fullStateName = row.state_name;
                // replacing the title and h2 header with the abbreviated and full state name
                var titleString = "<title>" + state + " Energy Consumption</title>";
                response = response.replace("<title>US Energy Consumption</title>", titleString);
                var h2String =  "<h2>" + fullStateName + " Yearly Snapshot</h2>"
                response = response.replace("<h2>Yearly Snapshot</h2>", h2String);
                // linking the prev and next state buttons
                
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
                response = response.replace("<a class=\"prev_next\" href=\"\">XX</a> <!-- change XX to prev", "<a class=\"prev_next\" href=\"/state/" + prevLink + "\">" + prevLink + "</a> <!-- change XX to prev");
                response = response.replace("<a class=\"prev_next\" href=\"\">XX</a> <!-- change XX to next", "<a class=\"prev_next\" href=\"/state/" + nextLink + "\">" + nextLink + "</a> <!-- change XX to next");
            });
            
            // Replace image and alt
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
                //Stringifying the data to be replaced preparation
                var stateString = "var state = " +"\""+ state+"\"";
                var coalString = "var coal_counts = " + JSON.stringify(stateOBJ['coal']);
                var naturalGasString = "var natural_gas_counts = " + JSON.stringify(stateOBJ['natural_gas']);
                var nuclearString = "var nuclear_counts = " + JSON.stringify(stateOBJ['nuclear']);
                var petroleumString = "var petroleum_counts = " + JSON.stringify(stateOBJ['petroleum']);
                var renewableString = "var renewable_counts = " + JSON.stringify(stateOBJ['renewable']);
                //Replacing the data in the HTML file
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
    }
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    var energyType = req.params.selected_energy_type;
    var energyTypes = ["coal", "natural_gas", "nuclear", "petroleum", "renewable"];
    // Writes 404 error page if selected energy type is not a valid energy type
    if ((energyTypes.indexOf(energyType) < 0)) {
        //Energy Type not in energyTypes list
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.write('Error: no data for energy type ' + energyType);
        res.end();
    }else{
        //Energy type in the energyTypes list
        ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
            let response = template;
            
            var jsonPerState={AK:[], AL:[], AR:[], AZ:[], CA:[], CO:[], CT:[], 
                DC:[], DE:[], FL:[], GA:[], HI:[], IA:[], ID:[], IL:[], IN:[], 
                KS:[], KY:[], LA:[], MA:[], MD:[], ME:[], MI:[], MN:[], MO:[],
                MS:[], MT:[], NC:[], ND:[], NE:[], NH:[], NJ:[], NM:[], NV:[],
                NY:[], OH:[], OK:[], OR:[], PA:[], RI:[], SC:[], SD:[], TN:[],
                TX:[], UT:[], VA:[], VT:[], WA:[], WI:[], WV:[], WY:[]};

            db.each("SELECT * FROM Consumption ORDER BY year", (err,row)=>{
                //Each row value gets pushed to the correct state value
                jsonPerState[row.state_abbreviation].push(row[req.params.selected_energy_type]);
            }, () => {
                //String processing if Energy Type is natural gas for displaying
                if(energyType=="natural_gas"){
                    var energyTypeSplit = energyType.split("_");
                    energyTypeSplit[0] = energyTypeSplit[0].charAt(0).toUpperCase() + energyTypeSplit[0].slice(1);
                    energyTypeSplit[1] = energyTypeSplit[1].charAt(0).toUpperCase() + energyTypeSplit[1].slice(1); 
                    capitalizedEnergyType = energyTypeSplit[0] + " " + energyTypeSplit[1];    
                }else{
                    capitalizedEnergyType = energyType.charAt(0).toUpperCase() +energyType.slice(1);
                }
                //Setting variables for replacement for titles
                var energyTypeString = "var energy_type = "+"\"" +capitalizedEnergyType + "\"";
                var energyCountsString = "var energy_counts = " + JSON.stringify(jsonPerState);
                // Handling capitalization of the energy type
                var capitalizedEnergyType;
                var consumptionSnapshotString = "<h2>"+capitalizedEnergyType+" "+"Consumption Snapshot</h2>";
                var titleEnergyTypeString = "<title>"+ "US" + " " + capitalizedEnergyType +" "+ "Energy Consumption" + "</title>"; 
                //Replacing variables in html file.
                response = response.replace("var energy_type", energyTypeString);
                response = response.replace("var energy_counts", energyCountsString);
                response = response.replace("<title>US Energy Consumption</title>", titleEnergyTypeString);
                response = response.replace("<h2>Consumption Snapshot</h2>", consumptionSnapshotString);
    
                //IMAGE Replacement
                response = response.replace("<img src=\"/images/noimage.jpg\" alt=\"No Image\"", "<img src=\"" + path.join("a", "images", energyType + ".jpg").substring(1) + "\" alt=\"Image of " + capitalizedEnergyType + "\"");
                
                // Button links
                var capitalizedEnergyTypes = ["Coal", "Natural Gas", "Nuclear", "Petroleum", "Renewable"];
                // prevLink and nextLink contain the index number of the previous or next energy type (wraps around)
                var prevLink = (energyTypes.indexOf(energyType) + 4) % 5;
                var nextLink = (energyTypes.indexOf(energyType) + 1) % 5;
                response = response.replace("<a class=\"prev_next\" href=\"\">XX</a> <!-- change XX to prev", "<a class=\"prev_next\" href=\"/energy-type/" + energyTypes[prevLink] + "\">" + capitalizedEnergyTypes[prevLink] + "</a> <!-- change XX to prev");
                response = response.replace("<a class=\"prev_next\" href=\"\">XX</a> <!-- change XX to next", "<a class=\"prev_next\" href=\"/energy-type/" + energyTypes[nextLink] + "\">" + capitalizedEnergyTypes[nextLink] + "</a> <!-- change XX to next");
                
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
                
                WriteHtml(res, response);
                });        
        }).catch((err) => {
            Write404Error(res);
        });
    }
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
