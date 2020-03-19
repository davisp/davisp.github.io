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

function createDownloadLink(name, filename) {
  var link = document.createElement("a");
  link.href = BLOB_URLS[name];
  link.id = name;
  link.download = filename;
  link.innerHTML = filename;
  var li = document.createElement("li");
  li.insertBefore(link, null);
  document.getElementById('results').insertBefore(li, null);
}

function createCSVLink(name, base_filename, data) {
  if(BLOB_URLS[name]) {
    URL.revokeObjectURL(BLOB_URLS[name]);
  }
  var blob = new Blob([data], {"type": "text/csv"});
  BLOB_URLS[name] = URL.createObjectURL(blob);
  createDownloadLink(name, base_filename + "-" + name + ".csv");
}

function createIMGLink(name, base_filename, data) {
  BLOB_URLS[name] = data;
  createDownloadLink(name, base_filename + "-" + name + ".png");
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

        var chart_cnv = document.getElementById('chart');
        var myChart = new Chart(chart_cnv, {
          type: 'bar',
          data: {
            labels: ['Tested', 'Untested'],
            datasets: [
              {
                label: 'Untested - Unknown',
                data: [0, summary["not_tested_unknown"]],
                backgroundColor: '#003f5c'
              },
              {
                label: 'Untested - Priority 5',
                data: [0, summary["not_tested_5"]],
                backgroundColor: '#444e86'
              },
              {
                label: 'Untested - Priority 4',
                data: [0, summary["not_tested_4"]],
                backgroundColor: '#955196'
              },
              {
                label: 'Untested - Priority 3',
                data: [0, summary["not_tested_3"]],
                backgroundColor: '#dd5182'
              },
              {
                label: 'Untested - Priority 2',
                data: [0, summary["not_tested_2"]],
                backgroundColor: '#ff6e54'
              },
              {
                label: 'Untested - Priority 1',
                data: [0, summary["not_tested_1"]],
                backgroundColor: '#ffa600'
              },
              {
                label: 'Negatives',
                data: [summary["negative"], 0],
                backgroundColor: '#00a5af'
              },
              {
                label: 'Positives',
                data: [summary["positive"], 0],
                backgroundColor: '#a2ff94'
              }
            ]
          },
          options: {
            responsive: false,
            animation: {
              duration: 0
            },
            legend: {
              align: "start",
              position: "bottom",
              reverse: true
            },
            scales: {
              xAxes: [{ stacked: true }],
              yAxes: [{ stacked: true }]
            }
          }
        });
        createIMGLink("graph", base_name, chart_cnv.toDataURL());

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
        createCSVLink("summary", base_name, $.csv.fromArrays(summary_rows));
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
        createCSVLink("positives", base_name, $.csv.fromArrays(positives));

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
        createCSVLink("negatives", base_name, $.csv.fromArrays(negatives));

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
        createCSVLink("untested", base_name, $.csv.fromArrays(untested));

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
          createCSVLink("untested-priority-" + pri, base_name, $.csv.fromArrays(pri_untested));
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
        createCSVLink("duplicates", base_name, $.csv.fromArrays(dupes));
      };
    })(f);

      // Read in the image file as a data URL.
      reader.readAsText(f);
    }
  }

  document.getElementById('files').addEventListener('change', handleFileSelect, false);
