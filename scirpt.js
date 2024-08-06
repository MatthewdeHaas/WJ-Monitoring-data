// AUTHOR: Matthew deHaas


// Instructions: 

// STEP 1: click ctrl + shft + i on  windows or cmd + opt + i on mac
// and paste entire code into console on the WJ website monitoring website:
// "https://monitoring.wjgl.com/.../index.html" 

// STEP 2: After a successful output, right click the console and click 
// "save as". Save the file as "cvs_data.txt" (this directory)

// STEP 3: run the python script "main.py" and notice the files populating in
// the "reports" folder of this directory



var days_back = 10;
var days_back_sec = days_back * 60 * 60 * 24;
var cp5_query_back = new CsiWebQuery("CP5:table1", "backfill", days_back_sec.toString(), "", "collected", 300000, -1,
[new CsiVariable("vacumm_PRESSURE", false),
new CsiVariable("flow_FLOW", false),
new CsiVariable("flow_Volume", false),
new CsiVariable("ejector_pressure_Pressure", false),
new CsiVariable("peizo_2_MASL", false),
new CsiVariable("peizo_1_MASL", false)], "", 0);

var variables = [
    new CsiVariable("vacuum_south_PRESSURE", false),
    new CsiVariable("vacuum_south_PRESSURE", false),
    new CsiVariable("flow_meter_1_Volume'", false),
    new CsiVariable("flow_meter_1_Flow'", false),
    new CsiVariable("flow_meter_1_Flow'", false),
    new CsiVariable("flow_meter_1_Volume'", false),
    new CsiVariable("Table1", true)
  ];

 var test_query_back = new CsiWebQuery("MTO_Simcoe:Table1", "backfill", "864000", "", "collected", 10000, -1, [variables[1], variables[4], variables[5] ], "",0);



var data_f_back = new CsiDataManager([cp5_query_back], false);
data_f_back.start();



// fill in with json response from data
var json_backfill = {};

async function getData() {
    const site = "MTO_Simcoe"; // change to cp5 name
    const url = `https://monitoring.wjgl.com/?command=DataQuery&uri=${site.toString()}%3ATable1&format=json&mode=backfill&p1=${days_back_sec.toString()}&p2=&headsig=0&nextpoll=10000&order=collected&_=${Date.now().toString()}`

    try {

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Response status ${response.status}`);

        const json = await response.json();
        // console.log(json);
        json_backfill = json;

    } catch (error) {
        console.error(error.message);
    }

}

await getData();

console.log(json_backfill);

var data_list = json_backfill['data'];


var sens = [];
var data_qrhr = [];

function init_data() {


    for (let i = 0; i < data_list.length; i++) {
        sens.push([data_list[i]['vals'][0], data_list[i][vals][1],
        data_list[i]['vals'][7], data_list[i]['vals'][8], data_list[i]['vals'][9],
        data_list[i]['time'].substring(0, data_list[i]['time'].indexOf("T")),
        data_list[i]['time']]);
    }


    for (let i = 0; i < sens.length; i++) {
        if ((parseInt(sens[i][5].toString().substring(sens[i][5].toString().indexOf(":") + 1, sens[i][5].toString().indexOf(":") + 3)) + 2) % 15 == 0) {
            data_qrhr.push(sens[i]);
        }
    }

    for (let i = 0; i < data_qrhr.length; i++) {
        if (parseInt(sens[i][5].toString().substring(sens[i][5].toString().indexOf(":") + 1, sens[i][5].toString().indexOf(":") + 3) == 58)) {
            data_qrhr[i][5] = (((parseInt(data_qrhr[i][5].substring(0, 2)) + 1) % 24).toString()).concat(":00:00");
        } else {
            data[i][5] = data_qrhr[i][5].substring(0, 2).concat(":", (parseInt(data_qrhr[i][5].indexOf(":") + 1, data_qrhr[i][5].indexOf(":") + 3) + 2).toString(), ":00")
        }
    }


}




function get_12hr_report(data, date=null, nights=null) {
    var i;
    for (i = data.length - 1; i >= 0; i--) {

        if (date == null && nights === null) {
            if (data[i][5] == "6:00:00" || data[i][5] == "18:00:00") break;
        }

        else if (date !== null && nights === null) {
            if (data[i][5] == "18:00:00" && data[i][6] == date) break;
        }

        else {
            if (data[i][6] == date) {
                if (nights == true) {
                    if (data[i][5] == "6:00:00") break;
                } else {
                    if (data[i][5] == "18:00:00") break;
                }
            }
        }


    }


    const rpts_per_12hr = (60 / 15) * 12;
    if (i <= rpts_per_day) return "insufficient data";

    var data_12hr = [];

    for (let j = 0; j < rpts_per_day + 1; j++) {
        data_12hr.push(data[i - j]);
    }
    
    return data_12hr.reverse();

}



function get_reports(data, from=null, to=null) {

    var today = data[data.length - 1][6];
    var reports = [];
    var date;

    if (from == null && to == null) {
        date = today;
        var i = 0;
        while (true) {

            var rpt_day = get_12hr_report(data, date, false);
            reports.push(rpt_day);

            var rpt_night = get_12hr_report(data, date, true);
            if (rpt_night == "insufficient data") return reports.reverse();
            else reports.push(rpt_night);

            i++;
            const rpts_per_day = (60 / 15) * 24;
            if (i * rpts_per_day > data.length) return reports.reverse();

            var d_temp = new Date(data[data.length - (i * rpts_per_day)][7]);
            d_temp.setDate(d_temp.getDate() - 1);
            date = reduce_date(d_temp);

        }
    }


    // TODO (not important)
    else if (from !== null && to === null) {
        date = today;


    }

    else {
        date = to;


    }


    return null;

}



function reduce_date(date) {

    var month = date.getMonth() + 1;
    if (month < 10) month = "0" + month.toString();
    var day = date.getDate();
    if (day < 10) day = "0" + day.toString();
    return (date.getFullYear().toString() + "-" + month.toString() + "-" + day.toString()).toString();

}


init_data();



var ten_day_report = get_reports(data_qrhr);


var clean_list = [];


for (let i = 0; i < ten_day_report.length; i++) {

    clean_list.push(ten_day_report[i])
    if (ten_day_report[i] != "insufficient data") {
        for (let j = 0; j < ten_day_report[i].length; j++) {
            let time = clean_list[i][j][5];
            let date = clean_list[i][j][6];
            clean_list[i][j].splice(5, 3);
            clean_list[i][j].splice(0, 0, date, time);
        }
    }

}


var clean_list_cvs = [];

for (let i = 0; i < clean_list.length; i++) {
    if (clean_list[i] != "insufficient data") clean_list_cvs.push(clean_list[i].join("\n"));
}


// where the console data 
console.log("START OF DATA\n");
for (let i = 0; i < clean_list_cvs.length; i++) console.log(clean_list_cvs[i] + "\nnew");

