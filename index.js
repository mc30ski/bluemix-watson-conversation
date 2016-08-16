var fs = require('fs');
var csv = require('csv-parse');
var prompt = require('prompt');

module.exports = function() {
  main();
};

// CONSTANTS - User will be prompted to override (where makes sense)

var FILE_CSV_INPUT = './corpus.csv';
var FILE_JSON_OUTPUT = './output.json';

var WORKSPACE_ID = 'fede7b10-f035-44d8-9fcd-80cddbcf08db';
var WORKSPACE_NAME = 'Workspace Test Name';
var WORKSPACE_DESC = 'Workspace Test Description';
var WORKSPACE_LANG = 'en';
var WORKSPACE_ANYTHING_ELSE = 'I do not understand what you are asking.';
var WORKSPACE_INTENT_NAME = 'my_intent';
var WORKSPACE_DATE = new Date();
var WORKSPACE_DATE_JSON = WORKSPACE_DATE.toJSON();

/**
 * Removes the trailer comma from a string (if ends in comma).
 * @param {string} str The string to check and modify.
 * @returns {string}
 */
function removeComma(str) {

  if (str.endsWith(',')) {
    str = str.substring(0, str.length - 1);
  }
  return str;
}

/**
 * Create a node name to use in JSON with the given index.
 * @param {number} cnt The index to use in the node name.
 * @returns {string}
 */
function createNodeName(cnt) {

  return 'node_' + (cnt + 1) + '_' + WORKSPACE_DATE.getTime();
}

/**
 * Build a dialog JSON to include in the workspace dialogs JSON.
 * @param {string} conditions The condition for the dialog (e.g. intent).
 * @param {string} nodeName The name of the node associated with this dialog.
 * @param {string} nodeNamePrev The prev node (sibling node).
 * @param {string} textOutput The Watson text output for this dialog.
 * @returns {string}
 */
function buildDialog(conditions, nodeName, nodeNamePrev, textOutput) {

  return dialogJSON =
    '{"go_to":null,' +
      '"output":{"text":"' + textOutput + '"},'+
      '"parent":null,' +
      '"context":null,' +
      '"created":"' + WORKSPACE_DATE_JSON + '",' +
      '"metadata":null,' +
      '"conditions":"' + conditions + '",' +
      '"description":null,' +
      '"dialog_node":"' + nodeName + '",' +
      '"previous_sibling":' +
        (nodeNamePrev ? '"' + nodeNamePrev + '"' : null) + '}';
}

/**
 * Build the overall workspace JSON by parsing the specified CSV file which
 * is of the format where each row has the Watson response first, the an
 * arbitrary amount of related questions for training.
 * @param {string} csvFile The CSV file to parse.
 */
function buildWorkspace(csvFile) {

  var parser = csv({delimiter: ','}, function(err, data) {

    var intents = '[', dialogs = '[';
    var nodeName = null, nodeNamePrev = null;

    var i = 0;
    for (; i < data.length; i++) {

      var intentName = WORKSPACE_INTENT_NAME + '_' + i;

      var intent =
        '{"intent":"' + intentName + '",' +
         '"created":"' + WORKSPACE_DATE_JSON + '",' +
         '"description":null,';

      var answer = '', questions = '[';

      for (j = 0; j < data[i].length; j++) {

        if (data[i][j]) {

          if (j == 0) {

            answer = data[i][j];
          }
          else {

            questions +=
              '{"text":"' + data[i][j] +
              '","created":"' + WORKSPACE_DATE_JSON + '"},';
      }}}

      questions = removeComma(questions) + ']';

      intent += '"examples":' + questions + '}';
      intents += intent + ',';

      nodeNamePrev = nodeName;
      nodeName = createNodeName(i);

      dialogs += buildDialog('#' + intentName, nodeName, nodeNamePrev, answer)
        + ',';
    }

    intents = removeComma(intents) + ']';

    dialogs += buildDialog(
      'anything_else', createNodeName(i), nodeName, WORKSPACE_ANYTHING_ELSE)
      + ']';

    var workspace =
      '{"name":"' + WORKSPACE_NAME + '",' +
      '"created":"' + WORKSPACE_DATE_JSON + '",' +
      '"intents":' + intents + ',' +
      '"entities": [],' +
      '"language":"' + WORKSPACE_LANG + '",' +
      '"metadata":null,' +
      '"modified":"' + WORKSPACE_DATE_JSON + '",' +
      '"created_by":null,' +
      '"description":"' + WORKSPACE_DESC + '",' +
      '"modified_by":null,' +
      '"dialog_nodes":' + dialogs + ',' +
      '"workspace_id":"' + WORKSPACE_ID + '"}';

    //console.log(intents);
    //console.log('----------------------------------');
    //console.log(dialogs);
    //console.log('----------------------------------');
    //console.log(workspace);
    //console.log('----------------------------------');
    //console.log(JSON.parse(workspace));

    fs.writeFile(FILE_JSON_OUTPUT, workspace, function (err) {

      if (err) {
        return console.log(err);
      }

      console.log('Worksplace JSON file saved to "' + FILE_JSON_OUTPUT + '".');
    });
  });

  fs.createReadStream(csvFile).pipe(parser);
}

/**
 * Prompts user for input from command line to override defaults.
 * @param {function} action Function to run after gathering input from user.
 */
function promptUserForInput(action) {

  var promptSchema = {

    properties: {

      fileInput: {
        description: 'Enter the File Input (CSV Corpus)',
        pattern: /^[a-zA-Z0-9\_\.\/]+$/,
        message:
          'CSV file name must be a valid file name.',
        required: true,
        default: FILE_CSV_INPUT
      },

      fileOutput: {
        description: 'Enter the File Output (JSON Workspace)',
        pattern: /^[a-zA-Z0-9\_\.\/]+$/,
        message:
          'JSON file name must be a valid file name.',
        required: true,
        default: FILE_JSON_OUTPUT
      },

      workspaceId: {
        description: 'Enter the Workspace ID',
        pattern: /^[a-zA-Z0-9\-]+$/,
        message: 'Workspace ID must be only letters, numbers or dashes.',
        required: true,
        default: WORKSPACE_ID
      },

      workspaceName: {
        description: 'Enter the Workspace Name',
        pattern: /^[a-zA-Z0-9\s]+$/,
        message: 'Workspace ID must be only letters, numbers or spaces.',
        required: true,
        default: WORKSPACE_NAME
      },

      workspaceDesc: {
        description: 'Enter the Workspace Description',
        pattern: /^[a-zA-Z0-9\s]+$/,
        message:
          'Workspace Description must be only letters, numbers or spaces.',
        required: true,
        default: WORKSPACE_DESC
      },

      workspaceLang: {
        description: 'Enter the Workspace Language',
        pattern: /^[a-z]{2,2}$/,
        message: 'Workspace Language must be 2 character language code.',
        required: true,
        default: WORKSPACE_LANG
      },

      workspaceAny: {
        description: 'Enter the Workspace misunderstood response',
        pattern: /^[a-zA-Z0-9\s\\.\\?\\!]+$/,
        message: 'Enter a valid Watson response.',
        required: true,
        default: WORKSPACE_ANYTHING_ELSE
      },

      workspaceIntent: {
        description: 'Enter the Workspace Intent prefix',
        pattern: /^[a-zA-Z0-9\_]+$/,
        message:
          'Workspace Intent prefix must be letters, numbers or underscore.',
        required: true,
        default: WORKSPACE_INTENT_NAME
      }
    }
  };

  prompt.start();

  // Prompt user with defaults, then override with input from user.
  prompt.get(promptSchema, function (err, result) {

    FILE_CSV_INPUT = result.fileInput;
    FILE_JSON_OUTPUT = result.fileOutput;

    WORKSPACE_ID = result.workspaceId;
    WORKSPACE_NAME = result.workspaceName;
    WORKSPACE_DESC = result.workspaceDesc;
    WORKSPACE_LANG = result.workspaceLang;
    WORKSPACE_ANYTHING_ELSE = result.workspaceAny
    WORKSPACE_INTENT_NAME = result.workspaceIntent;

    action();
  });
}

// Main function for dialog CLI
function main() {

  // First prompt user for inputs, then build workspace JSON.
  promptUserForInput(function () {

    buildWorkspace(FILE_CSV_INPUT);
  });

  /*
  fs.readFile('./test.json', 'utf8', function (err, data) {

    if (err) throw err;
    var obj = JSON.parse(data);
    console.log('----------------------------------');
    console.log(obj);
    console.log('----------------------------------');
  });
  */
}
