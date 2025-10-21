// global variables
var motivacionExpresada = "";
var primerNombre = "";
var linkCV = "";

// main
function processCVsFromGmail(){
  const folder = DriveApp.getFolderById(""); // CV folder
  const trash_folder = DriveApp.getFolderById(""); // Trash folder
  Logger.log("Folders found");
  var label = GmailApp.getUserLabelByName("CV_processed") || GmailApp.createLabel("CV_processed");
  // Limit date: 20 minutes ago
  const now = new Date();
  const twentyMinutesAgo = new Date(now.getTime() - 20*60*1000); // 20 minutes in miliseconds
  const afterTimestamp = Math.floor(twentyMinutesAgo.getTime() / 1000); // in seconds (Unix timestamp)
  // Search only received emails after that time
  var threads = GmailApp.search('has:attachment filename:pdf -label:CV_processed after:' + afterTimestamp);
  Logger.log("Looking for recent emails");
  threads.forEach(function(thread){
    thread.getMessages().forEach(function(msg){
      msg.getAttachments().forEach(function(file){
        if(file.getContentType() === "application/pdf"){
          try{
            var text = extractTextFromPDF(file); 
            var ans = isCV(text); 
            if(ans){ 
              var newFile = folder.createFile(file);
              linkCV = newFile.getUrl();
              Logger.log("CV saved");
              var fields = extractFields(text);
              motivacionExpresada = msg.getPlainBody();
              fillSheets(fields);
              var parsedFields = JSON.parse(fields);
              sendConfirmationEmail(parsedFields.correo, parsedFields.vacanteALaQueAplica);
              motivacionExpresada = "";
            } 
            else{
              trash_folder.createFile(file);
              Logger.log("Documento NO CV guardado");
            }
          } 
          catch(e){
            trash_folder.createFile(file);
            Logger.log("Error processing, saved in NO CV: " + e);
          }
        }
      });
    });
    thread.addLabel(label);
  });
}

// Get API Key from the environment
function getOpenaAIKey(){
  return PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
}

// Extract text
function extractTextFromPDF(pdfBlob){
  var tempFile = DriveApp.createFile(pdfBlob); // Temporary file in Drive (raw)
  var docFile = Drive.Files.copy( // Creates a copy of the temporary file
    {title: pdfBlob.getName(), mimeType: "application/vnd.google-apps.document"}, // Converts to docs
    tempFile.getId(),
    {convert: true} 
  );
  var doc = DocumentApp.openById(docFile.id); // Documento manejable desde Apps Script
  var text = doc.getBody().getText(); // Obtiene texto
  DriveApp.getFileById(tempFile.getId()).setTrashed(true); // Desecha temporales
  DriveApp.getFileById(docFile.id).setTrashed(true); // Desecha temporales
  return text;
}

// Verify with AI if it is a CV
function isCV(text){
  const url = "https://api.openai.com/v1/chat/completions";
  const payload = {
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content: "Eres un verificador de documentos. Debes responder solo con 'true' o 'false'."
      },
      {
        role: "user",
        content: `¿Este texto parece ser un curriculum vitae (CV)?\n\n${text}`
      }
    ]
  };  
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + getOpenaAIKey()
    },
    payload: JSON.stringify(payload)
  };
  var response = UrlFetchApp.fetch(url, options);
  var data = JSON.parse(response.getContentText());
  return data.choices[0].message.content.trim().toLowerCase() === "true"
}

// Extract fields
function extractFields(text){
  const url = "https://api.openai.com/v1/chat/completions";
  const payload = {
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content: "Eres un analizador de de documentos. Debes identificar los siguientes campos: nombre, correo, telefono, ubicacion,gradoEstudios, linkedIn, areaEspecialidad, nivelExperiencia,notaExperiencia, organizacionesRelevantes, idiomas, vacanteALaQueAplica, temasQueLeApasionan, deporte, evaluacionCulturalFit, primerNombre"
      },
      {
        role: "user",
        content: `Debes responder en formato JSON **estricto y válido**, sin explicaciones adicionales. 
        Asegúrate de que todos los nombres de los campos coincidan exactamente con los que te doy. 
        Si algún valor no se encuentra, usa null. 
        Si hay más de un valor, usa un array. 
        Escribe los números de teléfono solo con dígitos, sin espacios ni símbolos, e ignora la lada del país. 
        Usa exactamente este orden de campos: 
        "", nombre, correo, telefono, ubicacion, gradoEstudios, linkedIn, areaEspecialidad, nivelExperiencia, notaExperiencia, organizacionesRelevantes, idiomas, vacanteALaQueAplica, temasQueLeApasionan, deporte, evaluacionCulturalFit, primerNombre.
        Ejemplo de salida correcta:
        {
          "nombre": "Ana Camila Trujillo",
          "correo": "soytrujillo@gmail.com",
          "telefono": "2193",
          "ubicacion": "Tamaulipas",
          "gradoEstudios": "Licenciatura",
          "linkedIn": "(url de linkedin)",
          "areaEspecialidad": ["Innovación gubernamental"],
          "nivelExperiencia": "Junior",
          "notaExperiencia": "Microsoft Intern",
          "organizacionesRelevantes": ["Microsfot"],
          "idiomas": ["Español (nativo)", "Inglés (no indicado)"],
          "vacanteALaQueAplica": "Desarrollador Full Stack",
          "temasQueLeApasionan": ["Diseño centrado en el humano"],
          "deporte": "Fútbol",
          "evaluacionCulturalFit": "Alto Potencial",
          "primerNombre": "Ana"
        }
        Ten en cuenta:
        - Usa ortografía y gramática correctas.
        - Corrige mayúsculas, minúsculas, acentos y espacios si es necesario.
        - En "gradoDeEstudios" usa solo una de estas opciones: Licenciatura, Maestría, Doctorado, Carrera trunca, Sin estudios o Medicina.
        Texto a analizar:
        ${text}`
      }
    ]
  };  
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + getOpenaAIKey()
    },
    payload: JSON.stringify(payload)
  };
  var response = UrlFetchApp.fetch(url, options);
  var data = JSON.parse(response.getContentText());
  var raw = data.choices[0].message.content.trim();
  return raw;
}

// Fills the Google Sheets with the fields
function fillSheets(raw){
  const url = "";
  const parsedJSON = JSON.parse(raw);
  const sheet = SpreadsheetApp.openByUrl(url).getSheetByName("BD");
  function arrayToString(value){
    if(Array.isArray(value)) return value.join(",");
    return value || "";
  }
  var nombre = arrayToString(parsedJSON.nombre);
  var correo = arrayToString(parsedJSON.correo);
  var telefono = arrayToString(parsedJSON.telefono);
  var ubicacion = arrayToString(parsedJSON.ubicacion);
  var gradoEstudios = arrayToString(parsedJSON.gradoEstudios);
  var linkedIn = arrayToString(parsedJSON.linkedIn);
  var areaEspecialidad = arrayToString(parsedJSON.areaEspecialidad);
  var nivelExperiencia = arrayToString(parsedJSON.nivelExperiencia);
  var notaExperiencia = arrayToString(parsedJSON.notaExperiencia);
  var organizacionesRelevantes = arrayToString(parsedJSON.organizacionesRelevantes);
  var idiomas = arrayToString(parsedJSON.idiomas);
  var vacanteALaQueAplica = arrayToString(parsedJSON.vacanteALaQueAplica);
  var temasQueLeApasionan = arrayToString(parsedJSON.temasQueLeApasionan);
  var evaluacionCulturalFit = arrayToString(parsedJSON.evaluacionCulturalFit);
  var deporte = arrayToString(parsedJSON.deporte);
  primerNombre = arrayToString(parsedJSON.primerNombre);
  Logger.log(parsedJSON);
  sheet.appendRow(["", nombre, correo, telefono, ubicacion, gradoEstudios, linkedIn, areaEspecialidad, nivelExperiencia, notaExperiencia, organizacionesRelevantes, idiomas, vacanteALaQueAplica, temasQueLeApasionan, linkCV,"","","", evaluacionCulturalFit, deporte, motivacionExpresada]);
  Logger.log("Información guardada en Google Sheets");
}

// Gets a random GIF URL 
function getRandomGIF(){
  var sheet = SpreadsheetApp.openById("").getSheetByName("");
  var urls = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().flat();
  var random = Math.floor(Math.random()*urls.length);
  return urls[random];
}

// Confirmation email
function sendConfirmationEmail(email, vacante){
  if(!email){
    Logger.log("No se encontró un correo válido. No se envió el email.");
    return;
  }
  var gif = getRandomGIF();
  var saludoNombre = primerNombre ? "Hola " + primerNombre + "!" : "Hola!";
  var vacanteTexto = vacante || "";
  var subject = "Confirmación de recepción de tu CV";
  var htmlBody = `
    <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body>
        <p>${saludoNombre}</p>
        <p>
          Agradezco tu interés en ser parte de nuestro equipo en la vacante <strong>${vacanteTexto}</strong> ⚡️
        </p>
        <p>
          Confirmo que he recibido tu CV. 
        </p>
        <p>
          Quiero asegurarte de que cada aplicación es importante para nosotros. Nuestro equipo estará revisando tu perfil y tus experiencias. Me pondré en contacto contigo si tu perfil se ajusta a lo que nos hace falta para completar este super team.
        </p>
        <p>
          Gracias por considerar al Equipo de Emprendimiento en el Tec de Monterrey como un lugar en donde hacer lo que amas e impactar a millones de personas. &#x1F30E;
        </p>
        <p>Que tengas muy bonito día.</p>
        <p>Cyn</p>
        <img src="${gif}" alt="GIF diciendo gracias" style="max-width:400px">
      </body>
    </html>
  `;
  GmailApp.sendEmail(email, subject, "", {htmlBody: htmlBody});
  Logger.log("Correo de confirmación enviado a: " + email);

}
