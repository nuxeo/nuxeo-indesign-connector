/*
 * (C) Copyright 2006-2015 Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *     Michael Gena
 */
 
#include "../lib/json2.js"

$._ext_PHXS={
	initialize : function(){	
		alert("init");
		return;	
	},

    run : function(object) {
    	var string = unescape(object);
    	var assetInfo = JSON.parse(string);
       	var myDocument = app.activeDocument;
        addImage(myDocument, assetInfo.url, assetInfo.digest, assetInfo.id);
        return;
    },
    
    refresh : function() {
    	if(app.documents.length == 0){
    		return "";
    	}
	   	var myDocument = app.activeDocument;
	   	links = myDocument.links;
	   	var jsonResult = [];
	   	for (i = 0; i < links.length; i++) {
	   		var object = {};
	   		object.url = links[i].extractLabel("url");
	   		object.digest = links[i].extractLabel("digest");
	   		object.id = links[i].extractLabel("id");
	   		jsonResult.push(object);
	   		//alert(links[i].extractLabel("url") +" "+ links[i].extractLabel("digest"));
	   	} 
	   	var jsonEntries = {};
	   	jsonEntries.entries = jsonResult;
	   	jsonEntries = JSON.stringify(jsonEntries);
	   	//alert(jsonEntries);
	    return jsonEntries;
	},
	
	upload : function(object) {
    	var string = unescape(object);
    	var assetInfo = JSON.parse(string);
       	var myDocument = app.activeDocument;
        uploadAsset(myDocument, assetInfo.url);
        links = myDocument.links;	
	   	for (i = 0; i < links.length; i++) {
	   		if(links[i].extractLabel("id") == assetInfo.id){
	   			links[i].insertLabel("digest", assetInfo.digest);	
	   			try {
					links[i].update();
				} catch(err) {}   			
			}
	   	}
        return;
    },
    
    setToken : function(host, login, token){
    	var credential = new ActionDescriptor();
		credential.putString(app.stringIDToTypeID("host"), host);
		credential.putString(app.stringIDToTypeID("login"), login);
		credential.putString(app.stringIDToTypeID("token"), token);
		
		// "true" means setting persists across Photoshop launches.
		app.putCustomOptions(app.stringIDToTypeID("mySettings"), credential, true );
		  
    	//app.insertLabel("host", host);
    	//app.insertLabel("login", login);
    	//app.insertLabel("token", token);
    },
    
    getToken : function(){
    	var auth = {};
    	
    	var credential = app.getCustomOptions(app.stringIDToTypeID("mySettings"));
    	auth.host = credential.getString(app.stringIDToTypeID("host"));
	   	auth.login = credential.getString(app.stringIDToTypeID("login"));
	   	auth.token = credential.getString(app.stringIDToTypeID("token"));
    	
	   	//auth.host = app.extractLabel("host");
	   	//auth.login = app.extractLabel("login");
	   	//auth.token = app.extractLabel("token");
	   	//alert(JSON.stringify(auth));
    	return JSON.stringify(auth);
    	
    },
    
};


function uploadAsset(myDocument, url){

   	var fileName = url.split("/")[url.split("/").length-1];  	
    var filePath = "/tmp/";
    try{
        filePath = myDocument.path+"/";
    }catch(err){
         alert("Please save your document first.");
    return;  
    }
    
   	var myGraphicFile = File(filePath + fileName);            
   	var imageData = GetURL(url, true, 10);
   
   	if (imageData != null && imageData.body != null)
   	{
    	myGraphicFile.open("w");
      	myGraphicFile.encoding = "BINARY";
      	myGraphicFile.write(imageData.body);
      	myGraphicFile.close();
   	}
   	return myGraphicFile;
}


function addImage(myDocument, url, digest, id){ 
	var myGraphicFile = uploadAsset(myDocument, url);
	if((myGraphicFile != "")&&(myGraphicFile != null)){
        
        var pSourceDocument = open(myGraphicFile);
        pSourceDocument.artLayers[0].duplicate(myDocument);
    }
}

function GetURL(url,isBinary, kMaxRecursive301Calls)
{
  //
  // This function consists of up to three 'nested' state machines.
  // At the lowest level, there is a state machine that interprets UTF-8 and 
  // converts it to Unicode - i.e. the bytes that are received are looked at
  // one by one, and the Unicode is calculated from the one to four bytes UTF-8
  // code characters that compose it.
  //
  // The next level of state machine interprets line-based data - this is
  // needed to interpret the HTTP headers as they are received.
  //
  // The third level state machine interprets the HTTP reply - based on the
  // info gleaned from the headers it will process the HTTP data in the HTTP
  // reply
  //
  
  //
  // If things go wrong, GetURL() will return a null
  //
  var reply = null; 
  
  //
  // Below some symbolic constants to name the different states - these
  // make the code more readable.
  //
  const kUTF8CharState_Complete = 0;  
  const kUTF8CharState_PendingMultiByte = 1;
  const kUTF8CharState_Binary = 2;
  
  const kLineState_InProgress = 0;
  const kLineState_SeenCR = 1;
  
  const kProtocolState_Status = 1;
  const kProtocolState_Headers = 2;
  const kProtocolState_Body = 3;
  const kProtocolState_Complete = 4;
  const kProtocolState_TimeOut = 5;
  
  do
  {
    //
    // Chop the URL into pieces
    //
    var parsedURL = ParseURL(url);
    
    //
    // We only know how to handle HTTP - bail out if it is something else
    //
    if (parsedURL.protocol != "HTTP")
    {
      break;
    }
    
    //
    // Open up a socket, and set the time out to 2 minutes. The timeout
    // could be parametrized - I leave that as an exercise.
    //alert("before socket");
    var socket = new Socket;    
    socket.timeout = 120;
    //alert("after socket");
    //
    // Open the socket in binary mode. Sockets could also be opened in UTF-8 mode
    // That might seem a good idea to interpret UTF-8 data, but it does not work out
    // well: the HTTP protocol gives us a body length in bytes. If we let the socket 
    // interpret UTF-8 then the body length we get from the header, and the number of 
    // characters we receive won't match - which makes things quite awkward.
    // So we need to use BINARY mode, and we must convert the UTF-8 ourselves.
    //
    if (! socket.open(parsedURL.address + ":" + parsedURL.port,"BINARY"))
    {
      break;
    }

	var credential = app.getCustomOptions(app.stringIDToTypeID("mySettings"));
	
    //
    // Dynamically build an HTTP 1.1 request.
    // 
    if (isBinary)
    {
      var request = 
        "GET /" + parsedURL.path + " HTTP/1.0\n" +
        "Host: " + parsedURL.address + "\n" +
        "User-Agent: InDesign ExtendScript\n" +
        "Accept: */*\n" + 
        "X-Authentication-Token: "+credential.getString(app.stringIDToTypeID("token"))+"\n" +        
        "Connection: keep-alive\n\n";
        alert(request);
        
        //"X-Authentication-Token: 787718d1-788f-4b37-8c09-5f3301e506e3\n" +    
    }
    else
    {
      var request = 
        "GET /" + parsedURL.path + " HTTP/1.0\n" +
        "Host: " + parsedURL.address + "\n" +
        "User-Agent: InDesign ExtendScript\n" +
        "Accept: text/xml,text/*,*/*\n" + 
        "Accept-Encoding:\n" +
        "Connection: keep-alive\n" +
        "Accept-Language: *\n" + 
        "Accept-Charset: utf-8\n\n";
    }

    //
    // Send the request out
    //
    //alert(request);
    socket.write(request);
  
    //
    // readState keeps track of our three state machines
    //
    var readState =
    {
      buffer: "",
      bufPos: 0,
      //
      // Lowest level state machine: UTF-8 conversion. If we're handling binary data
      // the state is set to kUTF8CharState_Binary which is a 'stuck' state - it 
      // remains in that state all the time. If the data really is UTF-8 the state
      // flicks between kUTF8CharState_PendingMultiByte and kUTF8CharState_Complete
      // 
      curCharState: isBinary ? kUTF8CharState_Binary : kUTF8CharState_Complete,
      curCharCode: 0,
      pendingUTF8Bytes: 0,      
      //
      // Second level state machine: allows us to handle lines and line endings
      // This state machine can process CR, LF, or CR+LF line endings properly
      // The state flicks between kLineState_InProgress and kLineState_SeenCR
      //
      lineState: kLineState_InProgress,
      curLine: "",
      line: "",
      isLineReadyToProcess: false,
      //
      // Third level state machine: handle HTTP reply. This state gradually 
      // progresses through kProtocolState_Status, kProtocolState_Headers,
      // kProtocolState_Body, kProtocolState_Complete.
      // contentBytesPending is part of this state - it keeps track of how many 
      // bytes of the body still need to be fetched.
      //      
      protocolState: kProtocolState_Status,
      contentBytesPending: null,
      dataAvailable: true,
      //
      // The HTTP packet data, chopped up in convenient pieces.
      //
      status: "",
      headers: {},
      body: ""
    };

    //
    // Main loop: we loop until we hit kProtocolState_Complete as well as an empty data buffer
    // (meaning all data has been processed) or until something timed out.
    // 
    while 
    (
      ! (readState.protocolState == kProtocolState_Complete && readState.buffer.length <= readState.bufPos)
     &&
      readState.protocolState != kProtocolState_TimeOut
    )
    {
      //
      // If all data in the buffer has been processed, clear the old stuff
      // away - this makes things more efficient
      //
      if (readState.bufPos > 0 && readState.buffer.length == readState.bufPos)
      {
        readState.buffer = "";
        readState.bufPos = 0;
      }
    
      //
      // If there is no data in the buffer, try to get some from the socket
      //
      if (readState.buffer == "")
      {      
        //
        // If we're handling the body of the HTTP reply, we can try to optimize
        // things by reading big blobs of data. Also, we need to look out for
        // completion of the transaction.
        //
        if (readState.protocolState == kProtocolState_Body)
        {
          //
          // readState.contentBytesPending==null means that the headers did not
          // contain a length value for the body - in which case we need to process
          // data until the socket is closed by the server
          //
          if (readState.contentBytesPending == null)
          {
            if (! readState.dataAvailable && ! socket.connected)
            {
              //
              // The server is finished with us - we're done
              //
              socket = null;
              readState.protocolState = kProtocolState_Complete;
            }
            else
            {
              //
              // Attempt to read as many bytes as we can. If no bytes are returned
              // by a length-less read(), force a read of one byte which will make
              // the script wait for a byte to arrive
              //
              readState.buffer += socket.read();
              readState.dataAvailable = readState.buffer.length > 0;
              if (! readState.dataAvailable) 
              {
                 readState.buffer += socket.read(1);
                 readState.dataAvailable = readState.buffer.length > 0;
              }
            }
          }
          else
          {
            //
            // If the socket is suddenly disconnected, the server pulled the
            // rug from underneath us. Register this as a time out problem and
            // bail out.
            //
            if (! readState.dataAvailable && ! socket.connected)
            {
              socket = null;
              readState.protocolState = kProtocolState_TimeOut;
            }
            else
            {
              //
              // Try to get as much data as needed from the socket. We might 
              // receive less than we've asked for. 
              // 
              readState.buffer = socket.read(readState.contentBytesPending);
              readState.dataAvailable = readState.buffer.length > 0;
              readState.contentBytesPending -= readState.buffer.length;
              //
              // Check if we've received as much as we were promised in the headers
              // If so, we're done with the socket. 
              //
              if (readState.contentBytesPending == 0)
              {
                readState.protocolState = kProtocolState_Complete;
                socket.close();
                socket = null;
              }
              //
              // If we're downloading binary data, we can immediately shove the
              // whole buffer into the body data - there's no UTF-8 to worry about             
              //
              if (isBinary)
              {
                readState.body += readState.buffer;
                readState.buffer = "";
                readState.bufPos = 0;
              }
            }
          }
        }
        else if (readState.protocolState != kProtocolState_Complete)
        {
          //
          // We're reading headers or status right now - look out
          // for server disconnects
          //
          if (! readState.dataAvailable && ! socket.connected)
          {
            socket = null;
            readState.protocolState = kProtocolState_TimeOut;
          }
          else
          {
            readState.buffer += socket.read(1);
            readState.dataAvailable = readState.buffer.length > 0;
          }
        }
      }
      
      //
      // The previous stretch of code got us as much data as possible into
      // the buffer (but that might be nothing, zilch). If there is data,
      // we process a single byte here.
      //
      if (readState.buffer.length > readState.bufPos)
      {
        if (readState.curCharState == kUTF8CharState_Binary && readState.protocolState == kProtocolState_Body)
        {
            readState.body += readState.buffer;
            readState.bufPos = readState.buffer.length;
        }
        else 
        {
            //
            // Fetch a byte
            //
            var cCode = readState.buffer.charCodeAt(readState.bufPos++);
            
            switch (readState.curCharState)
            {
              case kUTF8CharState_Binary:
                //
                // Don't use the UTF-8 state machine on binary data
                //
                readState.curCharCode = cCode;
                readState.multiByteRemaining = 0;
                break;
              case kUTF8CharState_Complete:
                //
                // Interpret the various UTF-8 encodings - 1, 2, 3, or 4 
                // consecutive bytes encode a single Unicode character. It's all
                // bit-fiddling here: depending on the masks used, the bytes contain
                // 3, 4, 5, 6 bits of the whole character.
                // Check 
                // http://en.wikipedia.org/wiki/UTF-8
                //
                if (cCode <= 127)
                {
                  readState.curCharCode = cCode;
                  readState.multiByteRemaining = 0;
                }
                else if ((cCode & 0xE0) == 0xC0)
                {
                  readState.curCharCode = cCode & 0x1F;
                  readState.curCharState = kUTF8CharState_PendingMultiByte;
                  readState.pendingUTF8Bytes = 1;
                }
                else if ((cCode & 0xF0) == 0xE0)
                {
                  readState.curCharCode = cCode & 0x0F;
                  readState.curCharState = kUTF8CharState_PendingMultiByte;
                  readState.pendingUTF8Bytes = 2;
                }
                else if ((cCode & 0xF8) == 0xF0)
                {
                  readState.curCharCode = cCode & 0x07;
                  readState.curCharState = kUTF8CharState_PendingMultiByte;
                  readState.pendingUTF8Bytes = 3;
                }
                else
                {
                  // bad UTF-8 char
                  readState.curCharCode = cCode;
                  readState.pendingUTF8Bytes = 0;
                }
                break;
              case kUTF8CharState_PendingMultiByte:
                if ((cCode & 0xC0) == 0x80)
                {
                  readState.curCharCode = (readState.curCharCode << 6) | (cCode & 0x3F);
                  readState.pendingUTF8Bytes--;
                  if (readState.pendingUTF8Bytes == 0)
                  {
                    readState.curCharState = kUTF8CharState_Complete;
                  }
                }
                else
                {
                  // bad UTF-8 char
                  readState.curCharCode = cCode;
                  readState.multiByteRemaining = 0;
                  readState.curCharState = kUTF8CharState_Complete;
                }
                break;
            }
            
            //
            // If we've got a complete byte or Unicode char available, we process it
            //
            if (readState.curCharState == kUTF8CharState_Complete || readState.curCharState == kUTF8CharState_Binary)
            {
              cCode = readState.curCharCode;
              var c = String.fromCharCode(readState.curCharCode);
              if (readState.protocolState == kProtocolState_Body || readState.protocolState == kProtocolState_Complete)
              {
                //
                // Once past the headers, we simply append new bytes to the body of the HTTP reply
                //
                readState.body += c; 
              }
              else
              {
                //
                // While reading the headers, we look out for CR, LF or CRLF sequences            
                //
                if (readState.lineState == kLineState_SeenCR)
                {
                  // 
                  // We saw a CR in the previous round - so whatever follows,
                  // the line is now ready to be processed.
                  //
                  readState.line = readState.curLine;
                  readState.isLineReadyToProcess = true;
                  readState.curLine = "";
                  readState.lineState = kLineState_InProgress;
                  // 
                  // The CR might be followed by another one, or 
                  // it might be followed by a LF (which we ignore)
                  // or any other character (which we process).
                  //
                  if (cCode == 13) // CR
                  {
                    readState.lineState = kLineState_SeenCR;
                  }
                  else if (cCode != 10) // no LF
                  {
                    readState.curLine += c;
                  }
                }
                else if (readState.lineState == kLineState_InProgress)
                {
                  //
                  // If we're in the midsts of reading characters and we encounter
                  // a CR, we switch to the 'SeenCR' state - a LF might or might not
                  // follow.
                  // If we hit a straight LF, we can process the line, and get ready
                  // for the next one
                  //
                  if (cCode == 13) // CR
                  {
                    readState.lineState = kLineState_SeenCR;
                  }
                  else if (cCode == 10) // LF
                  {
                    readState.line = readState.curLine;
                    readState.isLineReadyToProcess = true;
                    readState.curLine = "";
                  }
                  else
                  {
                    // 
                    // Any other character is appended to the current line
                    //
                    readState.curLine += c;
                  }
                }
                
                if (readState.isLineReadyToProcess)
                {
                  //
                  // We've got a complete line to process
                  //
                  readState.isLineReadyToProcess = false;
                  if (readState.protocolState == kProtocolState_Status)
                  {
                    //
                    // The very first line is a status line. After that switch to
                    // 'Headers' state
                    //
                    readState.status = readState.line;
                    readState.protocolState = kProtocolState_Headers;
                  }
                  else if (readState.protocolState == kProtocolState_Headers)
                  {
                    //
                    // An empty line signifies the end of the headers - get ready
                    // for the body.
                    //
                    if (readState.line == "")
                    {
                      readState.protocolState = kProtocolState_Body;
                    }
                    else
                    {
                      //
                      // Tear the header line apart, and interpret it if it is
                      // useful (currently, the only header we process is 'Content-Length'
                      // so we know exactly how many bytes of body data will follow.
                      //
                      var headerLine = readState.line.split(":");
                      var headerTag = headerLine[0].replace(/^\s*(.*\S)\s*$/,"$1");
                      headerLine = headerLine.slice(1).join(":");
                      headerLine = headerLine.replace(/^\s*(.*\S)\s*$/,"$1");
                      readState.headers[headerTag] = headerLine;
                      if (headerTag == "Content-Length")
                      {
                        readState.contentBytesPending = parseInt(headerLine);
                        if (isNaN(readState.contentBytesPending) || readState.contentBytesPending <= 0)
                        {
                          readState.contentBytesPending = null;
                        }
                        else
                        {
                          readState.contentBytesPending -= (readState.buffer.length - readState.bufPos);
                        }
                      }
                    }
                  }
                }
              }
            }
        }
      }
    }
  
    //
    // If we have not yet cleaned up the socket we do it here
    //
    if (socket != null)
    {
      socket.close();
      socket = null;
    }
    
    reply = 
    {
      status: readState.status,
      headers: readState.headers,
      body: readState.body
    };
  } 
  while (false);

  if (reply.status.indexOf("301") >= 0)
  {
    if (recursive301CallLevel == undefined)
    {
      recursive301CallLevel = 0;
    }
    if (recursive301CallLevel < kMaxRecursive301Calls)
    {
      reply = GetURL(reply.headers.Location, isBinary, recursive301CallLevel + 1);
    }
  }

  return reply;
}

// ****************

function ParseURL(url)
{
  url=url.replace(/([a-z]*):\/\/([-\._a-z0-9A-Z]*)(:[0-9]*)?\/?(.*)/,"$1/$2/$3/$4");
  url=url.split("/");

  if (url[2] == "undefined") url[2] = "80";
  
  var parsedURL = 
  {
    protocol: url[0].toUpperCase(),
    address: url[1],
    port: url[2],
    path: ""
  };

  url = url.slice(3);
  parsedURL.path = url.join("/");
  
  if (parsedURL.port.charAt(0) == ':')
  {
    parsedURL.port = parsedURL.port.slice(1);
  }
  
  if (parsedURL.port != "")
  {
    parsedURL.port = parseInt(parsedURL.port);
  }
  
  if (parsedURL.port == "" || parsedURL.port < 0 || parsedURL.port > 65535)
  {
    parsedURL.port = 80;
  }
  
  parsedURL.path = parsedURL.path;
  
  return parsedURL;
}
