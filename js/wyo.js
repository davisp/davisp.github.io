var BLOB_URLS = {};
var COLUMN_NAMES = [
  "Last Name",
  "First Name",
  "Record ID",
  "Survey Timestamp",
  "Date of Birth",
  "City",
  "Gender",
  "Submitter Name (Please list your facility/clinic name)",
  "Submitter Address (street, city, state, zip)",
  "Specimen Collection Date",
  "High Priority?",
  "Date received by lab",
  "COVID-19 Result",
  "Result Date"
];

function createDownloadLink(name, base_filename, data, type) {
  if(BLOB_URLS[name]) {
    URL.revokeObjectURL(BLOB_URLS[name]);
  }
  var blob = new Blob([data], {"type": type});
  BLOB_URLS[name] = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = BLOB_URLS[name];
  link.download = base_filename + "-" + name + ".csv";
  link.innerHTML = base_filename + "-" + name + ".csv";
  var li = document.createElement("li");
  li.insertBefore(link, null);
  document.getElementById('results').insertBefore(li, null);
}

function objectToRow(data) {
  var ret = [];
  for(var i = 0; i < COLUMN_NAMES.length; i++) {
    ret.push(data[COLUMN_NAMES[i]]);
  }
  return ret;
}

function rowKey(row) {
  var fn = row["First Name"];
  var ln = row["Last Name"];
  var dob = row["Date of Birth"];
  return [
    fn.trim().toLowerCase(),
    ln.trim().toLowerCase(),
    dob.trim().toLowerCase()
  ]
}

function handleFileSelect(ev) {
  var files = ev.target.files;
  for(var i = 0, f; f = files[i]; i++) {
    if(!f.name.endsWith(".csv")) {
      continue;
    }

    var reader = new FileReader();
    reader.onload = (function(file) {
      document.getElementById('results').innerHTML = "";
      return function(e) {
        var base_name = file.name.substring(0, file.name.length - 4);
        var data = $.csv.toObjects(e.target.result);

        // Generate summary
        var summary = {
          "total": 0,
          "tested": 0,
          "positive": 0,
          "negative": 0,
          "not_tested": 0,
          "not_tested_unknown": 0,
          "not_tested_1": 0,
          "not_tested_2": 0,
          "not_tested_3": 0,
          "not_tested_4": 0,
          "not_tested_5": 0,
          "unknown": 0
        };
        for(var j = 0; j < data.length; j++) {
          var row = data[j];
          summary["total"] += 1;
          if(!row["COVID-19 Result"]) {
            row["COVID-19 Result"] = "";
          }
          if(row["COVID-19 Result"].trim().toLowerCase() == "positive") {
            summary["tested"] += 1;
            summary["positive"] += 1;
          } else if(row["COVID-19 Result"].trim().toLowerCase() == "negative") {
            summary["tested"] += 1;
            summary["negative"] += 1;
          } else if(row["COVID-19 Result"].trim() == "") {
            summary["not_tested"] += 1;
            if(!row["High Priority?"]) {
              summary["not_tested_unknown"] += 1;
            } else if(row["High Priority?"].trim().startsWith("1")) {
              summary["not_tested_1"] += 1;
            } else if(row["High Priority?"].trim().startsWith("2")) {
              summary["not_tested_2"] += 1;
            } else if(row["High Priority?"].trim().startsWith("3")) {
              summary["not_tested_3"] += 1;
            } else if(row["High Priority?"].trim().startsWith("4")) {
              summary["not_tested_4"] += 1;
            } else if(row["High Priority?"].trim().startsWith("5")) {
              summary["not_tested_5"] += 1;
            } else {
              summary["not_tested_unknown"] += 1;
            }
          } else {
            summary["unknown"] += 1;
          }
        }
        var summary_rows = [
          ["Group", "Count"],
          ["Total Records", summary["total"]],
          ["Total Tested", summary["tested"]],
          ["Positive", summary["positive"]],
          ["Negative", summary["negative"]],
          ["Untested", summary["not_tested"]],
          ["Untested - Priority 1", summary["not_tested_1"]],
          ["Untested - Priority 2", summary["not_tested_2"]],
          ["Untested - Priority 3", summary["not_tested_3"]],
          ["Untested - Priority 4", summary["not_tested_4"]],
          ["Untested - Priority 5", summary["not_tested_5"]],
          ["Untested - No Priority", summary["not_tested_unknown"]],
          ["Unclassified", summary["unknown"]]
        ];
        createDownloadLink("summary", base_name, $.csv.fromArrays(summary_rows), "text/csv");

        var chart = new CanvasJS.Chart("chartContainer", {
	        animationEnabled: true,
	        title:{
		        text: "Test Record Breakdown"
	        },
	        axisX: {
		        valueFormatString: "DDD"
	        },
	        axisY: {
		        prefix: ""
	        },
	        toolTip: {
		        shared: true
	        },
	        legend:{
		        cursor: "pointer"
	        },
	        data: [{
		        type: "stackedColumn",
		        name: "Positive",
		        showInLegend: "true",
		        dataPoints: [
			        { x: 0, y: 10 }
		        ]
	        },
	        {
		        type: "stackedColumn",
		        name: "Negative",
		        showInLegend: "true",
		        dataPoints: [
			        { x: 0, y: 50 }
		        ]
	        },
	        {
		        type: "stackedColumn",
		        name: "Untested - Priority 1",
		        showInLegend: "true",
		        dataPoints: [
			        { x: 1, y: 5 }
		        ]
	        },
	        {
		        type: "stackedColumn",
		        name: "Untested - Priority 2",
		        showInLegend: "true",
		        dataPoints: [
			        { x: 1, y: 52 }
		        ]
	        }]
        });
        chart.render();

        // Generate list of positive results
        var positives = [];
        for(var j = 0; j < data.length; j++) {
          var row = data[j];
          if(row["COVID-19 Result"].trim().toLowerCase() == "positive") {
            positives.push(objectToRow(row));
          }
        }
        positives.sort();
        positives.unshift(COLUMN_NAMES);
        createDownloadLink("positives", base_name, $.csv.fromArrays(positives), "text/csv");

        // Generate list of negative results
        var negatives = [];
        for(var j = 0; j < data.length; j++) {
          var row = data[j];
          if(row["COVID-19 Result"].trim().toLowerCase() == "negative") {
            negatives.push(objectToRow(row));
          }
        }
        negatives.sort();
        negatives.unshift(COLUMN_NAMES);
        createDownloadLink("negatives", base_name, $.csv.fromArrays(negatives), "text/csv");

        // Generate list of untested results
        var untested = [];
        for(var j = 0; j < data.length; j++) {
          var row = data[j];
          if(!row["COVID-19 Result"].trim()) {
            untested.push(objectToRow(row));
          }
        }
        untested.sort();
        untested.unshift(COLUMN_NAMES);
        createDownloadLink("untested", base_name, $.csv.fromArrays(untested), "text/csv");

        // Generate list of untested priority N results
        for(var pri = 1; pri <= 5; pri++) {
          var pri_untested = [];
          for(var j = 0; j < data.length; j++) {
            var row = data[j];
            if(!row["COVID-19 Result"].trim()) {
              if(row["High Priority?"].trim().startsWith("" + pri)) {
                pri_untested.push(objectToRow(row));
              }
            }
          }
          pri_untested.sort();
          pri_untested.unshift(COLUMN_NAMES);
          createDownloadLink("untested-priority-" + pri, base_name, $.csv.fromArrays(pri_untested), "text/csv");
        }

        // Generate list of duplicates results
        var seen = {};
        var dupes = [];
        for(var j = 0; j < data.length; j++) {
          var row = data[j];
          var key = rowKey(row);
          if(seen.hasOwnProperty(key)) {
            seen[key] += 1;
          } else {
            seen[key] = 1;
          }
        }
        for(var j = 0; j < data.length; j++) {
          var row = data[j];
          var key = rowKey(row);
          if(seen[key] > 1) {
            dupes.push(objectToRow(row));
          }
        }
        dupes.sort();
        dupes.unshift(COLUMN_NAMES);
        createDownloadLink("duplicates", base_name, $.csv.fromArrays(dupes), "text/csv");
      };
    })(f);

      // Read in the image file as a data URL.
      reader.readAsText(f);
    }
  }

  document.getElementById('files').addEventListener('change', handleFileSelect, false);
