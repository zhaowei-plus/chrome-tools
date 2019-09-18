// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict'

chrome.runtime.onInstalled.addListener(function() {
  // chrome.storage.sync.set({color: '#3aa757'}, function() {
  //   console.log("The color is green.");
  // });
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [new chrome.declarativeContent.PageStateMatcher({
          // pageUrl: { hostEquals: 'web.jituancaiyun.net' },
          pageUrl: { hostEquals: /* env-host */'web.jituancaiyun.com' },
        })],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ])
  })
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.contentScriptQuery === 'fetchGet') {
      fetch(request.url)
          .then(response => response.json())
          .then(response => sendResponse(response))
          .catch(error => console.log('Error:', error))
      return true
  } else if (request.contentScriptQuery === 'fetchPost') {
    fetch(request.url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, application/xml, text/plain, text/html, *.*',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(request.data)
    })
      .then(response => response.json())
      .then(response => sendResponse(response))
      .catch(error => console.log('Error:', error))
    return true
  }
})
// chrome.runtime.onConnect.addListener
