// AUTHOR: Matthew deHaas

// DESCRIPTION: WJ's network allows public requests to its server. Currently this code packages the data
// from WJ into 15 minute intervals back to an arbitrary number of days. The final objective
// is it create 12 hour partitions of data reflective of the coloured physical sheets meant to
// be filled out.

// CODE:
// THIS IS A TEST!!!
var most_recent_prompt;
var days_back_prompt;
var days_back;
while (true) {
	most_recent_prompt = prompt("type '0' for most recent report and '1' for a backlog");
	if (most_recent_prompt == "0" || most_recent_prompt == "1") break;
	else alert("Please enter either '0' or '1'");
}
while (true) {
	if (most_recent_prompt == "0") {
		days_back = 1;
		break;
	}
	days_back_prompt = prompt("Type the number of days back you want to go back to");
	days_back = parseInt(days_back_prompt);

	if (isNaN(days_back) || days_back < 1) alert("Please enter an integer greater than 0");
	else break;
}




var days_back_sec = days_back * 60 * 60 * 24;
var error_msg = "insufficient data";
var header_text = `"DATE/TIME", "EAST MW (MASL)", "WEST MW (MASL)", "INJECTOR STATION PRESSURE (PSI)", "VOLUME (L)", "FLOW (L/S)"`;


// third arg of cp5_qurey_back is the number of seconds to backfill to e.g. 864000 / (60 * 60 * 24) = 10 days
// run to load fresh data from the network
var cp5_query_back = new CsiWebQuery("CP5:Table1", "backfill", days_back_sec.toString(), "", "collected", 300000, -1, 
[new CsiVariable("vacuum_PRESSURE", false), 
new CsiVariable("flow_Flow'", false),
new CsiVariable("flow_Volume'", false),
new CsiVariable("ejector_pressure_Pressure'", false),
new CsiVariable("piezo_2_MASL'", false),
new CsiVariable("piezo_1_MASL'", false)], "", 0);
var data_f_back = new CsiDataManager([cp5_query_back], false);
data_f_back.start();

// acquire json response in from the network tab and set it equal to a variable such as the following (DO AFTER SUCCESSFUL NETWORK REQUEST)
var json_backfill = {};


async function getData(site) {

	const url = `https://monitoring.wjgl.com/P3130%20ECWE/?command=DataQuery&uri=${site}%3ATable1&format=json&mode=backfill&p1=${days_back_sec.toString()}&p2=&headsig=0&nextpoll=300000&order=collected&_=${Date.now().toString()}`


	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Response Status ${response.status}`);

		const json = await response.json();
		json_backfill = json;

	} catch (error) {
		console.error(error.message);
	}

}

// ensures data is fetched before program proceeds
await getData("CP5");

// utility arrays for parsing the data
var data_list = json_backfill['data'];
sens = [];
data_qrhr = [];

function init_data() { 


	// creates an array of lists of the form [EAST MW, WEST MW, EJECTOR STATION PRESSURE, VOLUME, FLOW]
	for (let i = 0; i < data_list.length; i++) {
		sens.push([data_list[i]['vals'][0], data_list[i]['vals'][1], 
			data_list[i]['vals'][7], data_list[i]['vals'][8], data_list[i]['vals'][9], 
			data_list[i]['time'].substring(data_list[i]['time'].indexOf("T") + 1), 
			data_list[i]['time'].substring(0, data_list[i]['time'].indexOf("T")),
			data_list[i]['time']]);
	}



	// creates another array from the previous with readings only every 15 minutes
	for (let i = 0; i < sens.length; i++) {
		if ((parseInt(sens[i][5].toString().substring(sens[i][5].toString().indexOf(":") + 1, sens[i][5].toString().indexOf(":") + 3)) + 2) % 15 == 0) {
			data_qrhr.push(sens[i]);
		}
	}



	// cleans the time values up
	for (let i = 0; i < data_qrhr.length; i++) {
		if (parseInt(data_qrhr[i][5].substring(data_qrhr[i][5].indexOf(":") + 1, data_qrhr[i][5].indexOf(":") + 3)) == 58) {
			// % 24 takes care of 00:00:00 not being 24:00:00
			var text = ((parseInt(data_qrhr[i][5].substring(0, 2)) + 1) % 24).toString() + ":00:00";
			if ((parseInt(data_qrhr[i][5].substring(0, 2)) + 1) % 24 < 10) text = "0" + text;
			data_qrhr[i][5] = text;
		} else {
			data_qrhr[i][5] = data_qrhr[i][5].substring(0, 2).concat(":", (parseInt(data_qrhr[i][5].substring(data_qrhr[i][5].indexOf(":") + 1, data_qrhr[i][5].indexOf(":") + 3)) + 2).toString(), ":00");
		}
	}


}


// INPUT: a properly formatted 2d data array (always data_qrhr),
// an optional date field formatted"" that specifies the day the report 
// is being filled out (defaults to the most recent relative to what is in the data field), 
// and a boolean value specifiying whether a report is for the day or night shift (defaults to day shift)
// OUTPUT: a 12 hour csv-formatted string from the previous shift 
// either 18:00-06:00 or 06:00-18:00 depending on the most recent data/time in the data_qrhr array
// returns "insufficient data" if there isn't enough data in the data_qrhr array to fill a 12 hour period
function get_12hr_report(data, date=null, nights=null, partial=false) {	
	var i;
	var today = data[data.length - 1][6];
	// iterating backwards so finding '18:00:00' would be the last value of the shift => day shift
	for (i = data.length - 1; i >= 0; i--) {
		

		// goes back to the first instance of one of these times and creates the report retroactively
		if (date === null && nights === null) {
			if (data[i][5] == "06:00:00" || data[i][5] == "18:00:00") break;
		}
		
		// defaults to days because that is the most recent
		else if (date !== null && nights === null) {
			if (data[i][5] == "18:00:00" && data[i][6] == date) break;
		}
		
		// both date and nights field is non-null
		else {
			if (data[i][6] == date) {
				if (nights == true) {
					if (data[i][5] == "06:00:00") break;
				} else {
					if (data[i][5] == "18:00:00") break;
				}
			}
		}	
		
	}
	
	// data in the data_qrhr array does not go back 12 hours

	const rpts_per_12hr = (60 / 15) * 12;
	
	if (i <= rpts_per_12hr && !partial) return error_msg;

	var data_12hr = [];
	// creates a list where 'i' is the start
	if (partial) {
		for (j = 0; j < data.length - i; j++) {
			data_12hr.push(data[i + j]);
		}
		return data_12hr;
	} else {
		// creates a list where 'i' is the end
		for (let j = 0; j < rpts_per_12hr + 1; j++) {
			data_12hr.push(data[i - j]);
		}
	
		// reversed here because the 'i' value is acquired backwards,
		// which makes the previous iteration assignment of data_12hr easier
		
		return data_12hr.reverse();
	}
}


// INPUT: optional date fields, where leaving both empty retrieves as many reports as possible
// given the data in data_qrhr, and leaving just the 'to' field empty assumes it is up to the most
// recent date available in data_qrhr
// OUTPUT: list of 12 hour reports with csv formatting as per the above helper function
function get_reports(data, from=null, to=null) {

	var today = data[data.length - 1][6];
	var reports = [];

	var date;
	if (to !== null) date = to;
	else date = today;

	var i = 0;
	while (true) {	
		var rpt_day = get_12hr_report(data, date, false);
		reports.push(rpt_day);
		
		var rpt_night = get_12hr_report(data, date, true);
		// not working right now (maybe indexing error?)
		//if (from !== null && (new Date(rpt_day[0][7].toString()) < new Date(from) || rpt_night[0][7].toString() < new Date(from)))

		if (rpt_night == "insufficient data") return reports.reverse(); // helper returns "insufficient data"
		else reports.push(rpt_night);
						
		i++;
		// not enough values in the previous day to make another report for (96 is one day)
		const rpts_per_day = (60 / 15) * 24;
		if (i * rpts_per_day > data.length) return reports.reverse();
			
		// decrement date
		var d_temp = new Date(data[data.length - (i * rpts_per_day)][7]);
		d_temp.setDate(d_temp.getDate() - 1);
		date = reduce_date(d_temp);
	}	

	return null;

}


// INPUT: js Date object
// OUTPUT: string of the format "YYYY-MM-DD"
function reduce_date(date) {
	var month = date.getMonth() + 1;
	if (month < 10) month = "0" + month.toString();
	var day = date.getDate();
	if (day < 10) day = "0" + day.toString();
	return (date.getFullYear().toString() + "-" + month.toString() + "-" + day.toString()).toString();
}



function clean_csv_reports(reports) {

	var clean_list = [];
	var clean_list_csv = [];
	for (let i = 0; i < reports.length; i++) {
	clean_list.push(reports[i]);
	if (reports[i] != error_msg) {
		for (let j = 0; j < reports[i].length; j++) {
			// reformats the list so that the date-time is before the data
			let date = new Date((clean_list[i][j][6] + "T" + clean_list[i][j][5]).toString());
			clean_list[i][j].splice(5, 3);
			clean_list[i][j].splice(0, 0, date.toString().substring(0, date.toString().indexOf("GMT") - 1));
			}
		}
	
	}

	for (let i = 0; i < clean_list.length; i++) {
		if (clean_list[i] != error_msg) clean_list_csv.push(clean_list[i]);
	}	

	for (let i = 0; i < clean_list_csv.length; i++) {
		for (let j = 0; j < clean_list_csv[i].length; j++) {
			clean_list_csv[i][j] = clean_list_csv[i][j].join(",");
		}
		clean_list_csv[i] = clean_list_csv[i].join("\n");
	}

	return clean_list_csv;	

}


init_data();

//console.log(get_12hr_report(data_qrhr, null, null, true));

if (most_recent_prompt == "0") {
	console.log(header_text + "\n" + clean_csv_reports([get_12hr_report(data_qrhr, null, null, true)])[0]);
}
else {
	
	var multiple_reports = get_reports(data_qrhr);
	var clean_list_csv = clean_csv_reports(multiple_reports);

	var long_data_str = "START OF DATA\n";

	for (let i = 0; i < clean_list_csv.length; i++) {
		var shift = "day";
		if (clean_list_csv[0].substring(clean_list_csv[i].indexOf(",") + 1, clean_list_csv[i].indexOf(":")) == "18") shift = "night";
			long_data_str += header_text + "\n" + clean_list_csv[i] + "\nnew\n";
	}

	long_data_str += "END OF DATA\n";
	console.log(long_data_str);
}




















