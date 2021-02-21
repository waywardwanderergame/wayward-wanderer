// Copyright 2021 Miles Barr <milesbarr2@gmail.com>
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function () {
  "use strict";

  // Get the page content HTML element.
  var pageContent = document.getElementById("page-content");

  // Prevent scrolling when grabbing the page content.
  pageContent.ontouchmove = function () {
    return false;
  };

  // Set up Google Analytics.
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    dataLayer.push(arguments);
  };
  gtag("js", new Date());
  gtag("config", "YOUR_GOOGLE_ANALYTICS_MEASUREMENT_ID", {
    custom_map: {
      dimension0: "mode",
      dimension1: "difficulty",
      dimension2: "destination",
      metric0: "exploration_time_msec",
    }
  });

})();
