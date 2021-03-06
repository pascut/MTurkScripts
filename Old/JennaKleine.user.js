// ==UserScript==
// @name         JennaKleine
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Stuff about JJNissen
// @author       You
// @include        http://*.mturkcontent.com/*
// @include        https://*.mturkcontent.com/*
// @include        http://*.amazonaws.com/*
// @include        https://*.amazonaws.com/*
// @include https://worker.mturk.com/*
// @include file://*
// @grant  GM_getValue
// @grant GM_setValue
// @grant GM_addValueChangeListener
// @grant        GM_setClipboard
// @grant GM_xmlhttpRequest
// @grant GM_openInTab
// @connect google.com
// @connect bing.com
// @connect yellowpages.com
// @connect *
// @connect crunchbase.com
// @require https://raw.githubusercontent.com/hassansin/parse-address/master/parse-address.min.js
// ==/UserScript==


// VCF Do something with?
(function() {
    'use strict';

    var automate=true;
    var email_re = /(([^<>()\[\]\\.,;:\s@"：+=\/\?%]+(\.[^<>()\[\]\\.,;:：\s@"\?]+)*)|("[^\?]+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g;

    var phone_re=/[\+]?[(]?[0-9]{3}[)]?[-\s\.\/]+[0-9]{3}[-\s\.\/]+[0-9]{4,6}/im;
    var fax_re=/Fax[:]?[\s]?([\+]?[(]?[0-9]{3}[)]?[-\s\.\/]+[0-9]{3}[-\s\.\/]+[0-9]{4,6})/im;


    var personal_email_domains=["aol.com","bigpond.com","frontiernet.net","gmail.com","icloud.com","mchsi.com","me.com","pacbell.net","rogers.com","rr.com","ymail.com"];
    var my_query = {};
    var email_list=[];
    var sch_name="School District Name", sch_domain="Domain of school district";
    var bad_urls=["www.greatschools.org","www.schooldigger.com","www.zillow.com","www.areavibes.com","elementaryschools.org",
                 "www.localschooldirectory.com","www.facebook.com","publicschoolsk12.com","www.century21.com","www.realtor.com",
                 "high-schools.com","www.privateschoolreview.com","www.publicschoolreview.com","www.niche.com","www.schoolcalendars.org",
                 "hometownlocator.com","www.trulia.com","en.wikipedia.org","usnews.com","cde.ca.gov","redfin.com",".neighborhoodscout.com",
                 "yelp.com","apartments.com","moovitapp.com","trueschools.com","nces.ed.gov","findglocal.com","glassdoor.com",
                 "spellingcity.com","glassdoor.co.in","wetakesection8.com","ratemyteachers.com","k12guides.com","yellowpages.com","usa.com",
                 "publicschoolsreport.com","noodle.com","school-supply-list.com","superpages.com","insideschools.org","century21.com",
                 "schooltree.org","alumniclass.com"];
    var country_domains=[".ar",".at",".au",".br",".ch",".cn",".de",".eu",".fr",".it",".jp",".ro",".ru",".se",".tw",".uk",".uy",".vn"];
    var first_try=true;

    function bad_email_url(to_check)
    {
        let i;
        for(i=0; i < bad_urls.length; i++)
        {
            if(to_check.indexOf(bad_urls[i])!==-1) return true;
        }
        return false;
    }

    function check_and_submit()
    {

        console.log("Checking and submitting");
        if( document.getElementsByName("School District Name")[0].value.indexOf(",")!==-1)
        {
            console.log("Found comma");
            document.getElementsByName("School District Name")[0].value=document.getElementsByName("School District Name")[0].value.split(",")[0];
        }
        if( document.getElementsByName("School District Name")[0].value.length>0 &&
           document.getElementsByName("Domain of school district")[0].value.length>0 && document.getElementsByName("Domain of school district")[0].value.indexOf("amazonaws.com")===-1)
        {
            if(automate)
                setTimeout(function() { document.getElementById("submitButton").click(); }, 0);
        }
        else
        {
            GM_setValue("returnHit",true);
        }
    }
    function is_bad_url(the_url)
    {
        var i;
        for(i=0; i < bad_urls.length; i++)
        {
            if(the_url.indexOf(bad_urls[i])!==-1) return true;
        }
        return false;
    }
    function dist_response(response,resolve,reject) {
        // console.log(JSON.stringify(response));
        var doc = new DOMParser()
        .parseFromString(response.responseText, "text/html");

        console.log("in dist_response");
//        for(var i in response) console.log("i="+i+", "+response[i]);
       console.log(response.finalUrl);
        var search;

        var b_algo;
     //   var g_stuff;
        var i;
       // var g1_success=false;
        var b_url="crunchbase.com", b_name;

        var b1_success=false, b_header_search;
        var name_split;
        try
        {
            search=doc.getElementById("b_content");

            b_algo=search.getElementsByClassName("b_algo");

            console.log("b_algo.length="+b_algo.length);
            if(b_algo.length===0)
            {
                do_NA();
                return;
            }
          //  console.log("search.innerHTML="+search.innerHTML);
            //search=doc.getElementById("search");
            //g_stuff=search.getElementsByClassName("g");
          //  var t_url="crunchbase.com", t_header_search="";
            i=0;
            var fax_match;
            for(i=0; i < b_algo.length; i++)
            {
                b_name=b_algo[i].getElementsByTagName("a")[0].textContent;
                b_url=b_algo[i].getElementsByTagName("a")[0].href;
                name_split=b_name.split(/\s-\s/);
                if(i==b_algo.length-1 || (name_split[0].indexOf(",")===-1 && name_split[0].indexOf("List of")===-1 &&
              name_split[0].indexOf("Wikipedia:")===-1 && name_split[0].indexOf("Historic District")===-1) )
                {
                    b1_success=true;
                    break;
                }

            }
            if(b1_success)
            {
                resolve(JSON.stringify({url: b_url, name: b_name, error:false}));
            }

            else
            {
                reject=(JSON.stringify({error: true, errorText: "Failed to find any urls"}));
            }
        }
        catch(error)
        {

            console.log("Error "+error);
            reject(JSON.stringify({error: true, errorText: error}));
        }
    }

    function domain_response(response,resolve,reject) {
        // console.log(JSON.stringify(response));
        var doc = new DOMParser()
        .parseFromString(response.responseText, "text/html");

        console.log("in domain_response");
//        for(var i in response) console.log("i="+i+", "+response[i]);
       console.log(response.finalUrl);
        var search;

        var b_algo;
     //   var g_stuff;
        var i;
       // var g1_success=false;
        var b_url="crunchbase.com", b_name;

        var b1_success=false, b_header_search;
        try
        {
            search=doc.getElementById("b_content");

            b_algo=search.getElementsByClassName("b_algo");

            console.log("b_algo.length="+b_algo.length);
          //  console.log("search.innerHTML="+search.innerHTML);
            //search=doc.getElementById("search");
            //g_stuff=search.getElementsByClassName("g");
          //  var t_url="crunchbase.com", t_header_search="";
            i=0;
            var fax_match;
            for(i=0; i < b_algo.length; i++)
            {
                b_name=b_algo[i].getElementsByTagName("a")[0].textContent;
                b_url=b_algo[i].getElementsByTagName("a")[0].href;
                if(!is_bad_url(b_url))
                {
                    b1_success=true;
                    break;
                }

            }
            if(b1_success)
            {
                resolve(JSON.stringify({url: b_url, name: b_name, error:false}));
            }

            else
            {
                console.log("No urls");
                do_NA();
                return true;
                //reject(JSON.stringify({error: true, errorText: "Failed to find any urls"}));
            }
        }
        catch(error)
        {

            console.log("Error "+error);
            reject(JSON.stringify({error: true, errorText: error}));
        }
    }
    function dist_search(resolve,reject) {
        var search_str="school district "+my_query.name+" "+my_query.city+" "+my_query.state+" site:en.wikipedia.org";
//        if(!first_try) google_search_str=google_search_str+" "+my_query.country;
        console.log("Searching with bing for "+search_str);
        var search_URIBing='https://www.bing.com/search?q='+encodeURIComponent(search_str)+"&first=1&rdr=1";
        var domain_URL='https://www.google.com/search?q='+encodeURIComponent(search_str);//+" company");
        GM_xmlhttpRequest({
            method: 'GET',
            url:    search_URIBing,

            onload: function(response) {
             //   console.log("On load in crunch_response");
            //    crunch_response(response, resolve, reject);
             dist_response(response, resolve, reject);
            },
            onerror: function(response) { reject("Fail"); },
            ontimeout: function(response) { reject("Fail"); }


            });
    }
      function domain_search(resolve,reject) {
        var search_str="school district "+my_query.name+" "+my_query.city+" "+my_query.state+" -site:publicschoolsk12.com";
//        if(!first_try) google_search_str=google_search_str+" "+my_query.country;
        console.log("Searching with bing for "+search_str);
        var search_URIBing='https://www.bing.com/search?q='+encodeURIComponent(search_str)+"&first=1&rdr=1";
          console.log("search_URIBing=\n"+search_URIBing);
        var domain_URL='https://www.google.com/search?q='+encodeURIComponent(search_str);//+" company");
        GM_xmlhttpRequest({
            method: 'GET',
            url:    search_URIBing,

            onload: function(response) {
             //   console.log("On load in crunch_response");
            //    crunch_response(response, resolve, reject);
             domain_response(response, resolve, reject);
            },
            onerror: function(response) { reject("Fail"); },
            ontimeout: function(response) { reject("Fail"); }


            });
    }
    function get_domain_only(the_url)
    {
        var httpwww_re=/https?:\/\/www\./;
        var http_re=/https?:\/\//;
        var slash_re=/\/.*$/;
        var ret=the_url.replace(httpwww_re,"").replace(http_re,"").replace(slash_re,"");
        return ret;
    }
    /* Following the finding the district stuff */
    function dist_promise_then(to_parse) {

        var search_str, search_URI, search_URIBing;
        var search_result=JSON.parse(to_parse);
        console.log("search_result="+to_parse);
        var name_split;
        var dist_test_re=/(district$)|(schools$)|(department of education$)/i;
        if(!search_result.error)
        {
            /* we got a good result */
            name_split=search_result.name.split(/\s-\s/);
            if(name_split[0].length===0 || name_split[0].indexOf(",")!==-1 || name_split[0].indexOf("List of")!==-1 ||
              name_split[0].indexOf("Wikipedia:")!==-1 || name_split[0].indexOf("Historic District")!==-1)
            {
                my_query.bad_wiki=true;
            }
            else
            {

               /* if
                       (name_split[0].toLowerCase().indexOf("district")!==-1 || name_split[0].toLowerCase().indexOf("schools")!==-1 ||
                       name_split[0].toLowerCase().indexOf("department of education")!==-1)*/
                if(dist_test_re.test(name_split[0]))
                    {
                        my_query.bad_wiki=true;

                        //document.getElementsByName("School District Name")[0].value=name_split[0].trim();
                        //my_query.name=name_split[0].trim();
                    }
                else
                {
                    my_query.bad_wiki=true;
                }
            }
            const domainPromise = new Promise((resolve, reject) => {
                console.log("Beginning domain search");
                domain_search(resolve, reject);
            });
            domainPromise.then(domain_promise_then
                            )
                .catch(function(val) {
                console.log("Failed domain " + val);   GM_setValue("returnHit",true); });
            //document.getElementsByName("Domain of school district")[0].value=get_domain_only(search_result.url);
            //check_and_submit();
            return true;
        }
        else
        {

            /* Didn't get a new URL, quit */
            console.log("Had an error: "+search_result.errorText);
            GM_setValue("returnHit",true);
            return false;
        }

    }

    function domain_promise_then(to_parse) {

        var search_str, search_URI, school_URI;

        var search_result=JSON.parse(to_parse);
        console.log("search_result="+to_parse);
        var name_split;
        var schools_dist_re=/(([A-Z]+\w*)\s)+((District)|(Schools)|(USD)|(ISD)|(Department of Education))([\s\d])*$/;
         var bad_school_re=/(^All Schools)|(^Charter Schools)|(^Search Schools)|(Private Schools)|(Our Schools)|(^Magnet Schools)|(^Alternative Schools)|(^STEM Schools)|(^Our)|(^Find Schools)|( is )|(^What)|(^Attendance)|(^Elementary Schools)|(^Safe Schools)|(Our District)|(School Board$)|(Career Schools)/i;

        if(!search_result.error)
        {
            /* we got a good result */
            name_split=search_result.name.split(/\s[\-\/|–]\s/);
            if(my_query.bad_wiki)
            {
                let i;
                for(i=0; i < name_split.length; i++)
                {
                    console.log("name_split["+i+"]="+name_split[i]);
                    if(schools_dist_re.test(name_split[i]) && !bad_school_re.test(name_split[i]))
//                       (name_split[i].toLowerCase().indexOf("district")!==-1 || name_split[i].toLowerCase().indexOf("schools")!==-1))
                    {
                        document.getElementsByName("School District Name")[0].value=name_split[i].trim();
                        break;
                    }

                }
            }

            document.getElementsByName("Domain of school district")[0].value=get_domain_only(search_result.url);
            if(document.getElementsByName(sch_name)[0].value.length>0)
            {
                check_and_submit();
                return true;
            }
            else
            {
                /* We need to see if the district name is on the page */
                var slash_re=/(https?:\/\/)(www\.)?(([^\.]*\.)*)([^\/\.]*\.[^\/\.]*)(\/.*)$/;
                var the_url=search_result.url;//.replace(slash_re, function(match, p1,p2,p3) { return p1+p3; });
                search_result.url=search_result.url.replace(slash_re, function(match, p1,p2,p3,p4,p5,p6) {
                    console.log("p1="+p1+",p2="+p2+",p3="+p3);
                    console.log("p4="+p4+", p5="+p5);
                    if(p3.indexOf(".k12.")!==-1 || p5.indexOf("schoolloop.com")!==-1 || p5.indexOf(".us")!==-1 ||
                       p5.indexOf("edline.net")!==-1   || p5.indexOf("sharpschool.com")!==-1 || p5.indexOf("edlinesites.net")!==-1 ||
                      p5.indexOf("sites.google.com")!==-1)
                    {
                        if(p5.indexOf("edline.net")!==-1  || p5.indexOf("edlinesites.net")!==-1 || p5.indexOf("sites.google.com")!==-1)
                        {
                            return search_result.url;
                        }
                        if(p2!==undefined)
                        {
                            return p1+p2+p3+p5;
                        }
                        return p1+p3+p5;
                    }

                    if(p2!==undefined)
                    {
                        return p1+p2+p5;
                    }

                    return p1+p5; });
                my_query.good_url=search_result.url.replace(/https?:\/\//,"");
                console.log("the_url for school="+search_result.url);
                if(my_query.good_url==="childcarecenter.us")
                {
                    /* It's not a school with district */
                    document.getElementsByName(sch_name)[0].value="n/a";
                    document.getElementsByName(sch_domain)[0].value="n/a";
                    check_and_submit();
                    return true;
                }
                GM_xmlhttpRequest({
                    method: 'GET',
                    url:    search_result.url,

                    onload: function(response) {
                        //   console.log("On load in crunch_response");
                        //    crunch_response(response, resolve, reject);
                        var doc = new DOMParser()
                        .parseFromString(response.responseText, "text/html");
                        if(doc.title.indexOf("Error")!==-1)
                        {
                            console.log("FAILED WITHOUT WWW");
                            GM_xmlhttpRequest({
                                method: 'GET',
                                url:    search_result.url.replace(/https?:\/\//,"$&www."),

                                onload: function(response) {
                                    //   console.log("On load in crunch_response");
                                    //    crunch_response(response, resolve, reject);
                                    school_response(response);
                                },
                                onerror: function(response) {



                                    console.log("FAIL"); reject("Fail"); },
                                ontimeout: function(response) { console.log("FAIL"); reject("Fail"); }


                            });
                        }
                        else
                        {
                            school_response(response);
                        }
                    },
                    onerror: function(response) {
                        console.log("FAILED WITHOUT WWW");
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url:    search_result.url.replace(/https?:\/\//,"$&www."),

                            onload: function(response) {
                                //   console.log("On load in crunch_response");
                                //    crunch_response(response, resolve, reject);
                                school_response(response);
                            },
                            onerror: function(response) {



                                console.log("FAIL"); reject("Fail"); },
                            ontimeout: function(response) { console.log("FAIL"); reject("Fail"); }


                        });

                         },
                    ontimeout: function(response) { console.log("FAIL"); reject("Fail"); }


                });
            }
        }
        else
        {

            /* Didn't get a new URL, quit */
            console.log("Had an error: "+search_result.errorText);
            GM_setValue("returnHit",true);
            return false;
        }

    }
    /* Try to find the school district name */
    function school_response(response)
    {
        console.log("On school_response");
        var doc = new DOMParser()
        .parseFromString(response.responseText, "text/html");
        var the_links=doc.links;
        var i;
        var schools_dist_re=/((([A-Z]+\w*)\s)+((District)|(Schools)|(ISD)|(CSD)|(USD)|(UFSD))([\s\d])*)|(School District.*)|(School Board)|(School Department)$/;
        var bad_school_re=/(^All Schools)|(^Charter Schools)|(^Search Schools)|(Private Schools)|(Our Schools)|(^Magnet Schools)|(^Alternative Schools)|(^STEM Schools)|(^Our)|(^Find Schools)|( is )|(^What)|(^Attendance)|(^Elementary Schools)|(^Safe Schools)|(Our District)|(School Board$)|(Career Schools)/i;

        var na_schools_re=/(Charter School)|(Private School)/;
        var good_href;
        var good_content;
        console.log("doc.title="+doc.title);
        var split_title=doc.title.split(/\s[\/\-\|_](\s|$)/);

        for(i=0; i < split_title.length; i++)
        {
            console.log("split_title["+i+"]="+split_title[i]);

            if(schools_dist_re.test(split_title[i])&&!bad_school_re.test(split_title[i]))
            {
                console.log("Title Success with "+split_title[i]);
                good_content=split_title[i].replace(/^Welcome (to )?(the)?/,"");
                document.getElementsByName(sch_name)[0].value=good_content;
                good_href=response.finalUrl.toString().replace("s3.amazonaws.com",my_query.good_url);
                console.log("the_links[i].href="+good_href);
                document.getElementsByName(sch_domain)[0].value=get_domain_only(good_href);
                check_and_submit();
                return true;
            }
        }
        for(i=0; i < the_links.length; i++)
        {
            if(schools_dist_re.test(the_links[i].textContent)&&!bad_school_re.test(the_links[i].textContent))
            {
                console.log("Success with "+the_links[i].textContent);
                good_content=the_links[i].textContent.replace(/^Welcome (to )?(the)?/,"");
                document.getElementsByName(sch_name)[0].value=good_content;
                good_href=the_links[i].href.toString().replace("s3.amazonaws.com",my_query.good_url);
                console.log("the_links[i].href="+good_href);
                document.getElementsByName(sch_domain)[0].value=get_domain_only(good_href);
                check_and_submit();
                return true;
            }
        }
        var gb_footer=doc.getElementById("gb-footer-copyright");
        if(gb_footer===undefined || gb_footer===null)
        {
            gb_footer=doc.getElementById("gb-schoolwires-footer");
        }
        var good_re=/;\s+([^;|\n]*)\s{2}/;
        var my_match;
        if(gb_footer!==undefined && gb_footer!==null)
        {
            console.log("in gb_footer="+gb_footer.innerText);
            my_match=gb_footer.textContent.match(good_re);
            if(my_match!==null && my_match.length>1)
            {
                console.log("my_match = "+JSON.stringify(my_match));
                document.getElementsByName(sch_name)[0].value=my_match[1];
                check_and_submit();
                return true;
            }
        }


        console.log("Failed to find school name");
        /* Final check for copyright in full document */
        var copyright_re=/Copyright © [\d]{4} ([^\n\.]*)/i;
        var copy_match=doc.body.textContent.match(copyright_re);
        if(copy_match!==null && copy_match.length>=2 && copy_match[1] !== undefined)
        {
            console.log("Success");
            document.getElementsByName(sch_name)[0].value=copy_match[1];
            check_and_submit();
            return true;
        }
        console.log("Failed to match");
        var charter_test=/charter/i;
        if(charter_test.test(my_query.name))
        {
            console.log("Is charter");
            document.getElementsByName(sch_name)[0].value=my_query.name;
        }
        else
        {
            GM_setValue("returnHit",true);
            return false;
        }
    }



    function google1_response(response) {
        console.log("In google1_response");
        // console.log(JSON.stringify(response));
        var doc = new DOMParser()
        .parseFromString(response.responseText, "text/html");
        var bkWMgd;
        var search=doc.getElementById("search");
        if(search===undefined)
        {
            console.log("Google wall");
            GM_setValue("returnHit",true);
            return false;
        }

        try
        {
            bkWMgd=search.getElementsByClassName("bkWMgd");
        }
        catch(error)
        {
            console.log("Google wall");
            GM_setValue("returnHit",true);
            return false;
        }

        var g_stuff;
        var i,j;
        var g1_success=false;
        var s_stuff;
        var good_email;
        var good_phone="";
        var t_url="", t_header_search="";
        if(bkWMgd!==undefined && bkWMgd.length>0)
        {
            g_stuff=bkWMgd[0].getElementsByClassName("g");
            for(i=0; i < g_stuff.length; i++)
            {
                try
                {
                    //console.log("g_stuff[i].innerHTML="+g_stuff[i].innerHTML);
                    s_stuff=g_stuff[i].getElementsByClassName("s")[0].innerText;
                    console.log("s_stuff="+s_stuff);
                    //console.log("Past s_stuff");
                    t_url=g_stuff[i].getElementsByTagName("a")[0].href;
                    for(j=0; j < email_list.length; j++)
                    {
                        if(!bad_email_url(t_url) && s_stuff.toLowerCase().indexOf(email_list[j])!==-1)
                        {
                            let phone_match=s_stuff.match(phone_re);
                            console.log("phone_match="+phone_match);
                            if(phone_match!==null && phone_match.length>0)
                            {
                                good_phone=phone_match[0];
                            }
                            g1_success=true;
                            good_email=email_list[j];
                            break;
                        }
                    }

                }
                catch(error)
                {
                    console.log("ERROR "+error);
                    GM_setValue("returnHit",true);
                    return false;

                }
                if(g1_success) break;

                //console.log(temp1);
            }
        }
        if(g1_success)
        {
            document.getElementById("email_address").value=good_email;
            document.getElementById("web_url").value=t_url;
            if(good_phone.length>0)
            {
                document.getElementById("phone_number").value=good_phone;
            }
            console.log("Email Found!");
            check_and_submit();
            return true;
        }
        else
        {
            console.log("Google search for email exactness failed");
            GM_setValue("returnHit",true);

        }
    }


    var defaultDiacriticsRemovalMap = [
        {'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
        {'base':'AA','letters':/[\uA732]/g},
        {'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
        {'base':'AO','letters':/[\uA734]/g},
        {'base':'AU','letters':/[\uA736]/g},
        {'base':'AV','letters':/[\uA738\uA73A]/g},
        {'base':'AY','letters':/[\uA73C]/g},
        {'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
        {'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
        {'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
        {'base':'DZ','letters':/[\u01F1\u01C4]/g},
        {'base':'Dz','letters':/[\u01F2\u01C5]/g},
        {'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
        {'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
        {'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
        {'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
        {'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
        {'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
        {'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
        {'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
        {'base':'LJ','letters':/[\u01C7]/g},
        {'base':'Lj','letters':/[\u01C8]/g},
        {'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
        {'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
        {'base':'NJ','letters':/[\u01CA]/g},
        {'base':'Nj','letters':/[\u01CB]/g},
        {'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
        {'base':'OI','letters':/[\u01A2]/g},
        {'base':'OO','letters':/[\uA74E]/g},
        {'base':'OU','letters':/[\u0222]/g},
        {'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
        {'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
        {'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
        {'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
        {'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
        {'base':'TZ','letters':/[\uA728]/g},
        {'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
        {'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
        {'base':'VY','letters':/[\uA760]/g},
        {'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
        {'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
        {'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
        {'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
        {'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
        {'base':'aa','letters':/[\uA733]/g},
        {'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
        {'base':'ao','letters':/[\uA735]/g},
        {'base':'au','letters':/[\uA737]/g},
        {'base':'av','letters':/[\uA739\uA73B]/g},
        {'base':'ay','letters':/[\uA73D]/g},
        {'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
        {'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
        {'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
        {'base':'dz','letters':/[\u01F3\u01C6]/g},
        {'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
        {'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
        {'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
        {'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
        {'base':'hv','letters':/[\u0195]/g},
        {'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
        {'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
        {'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
        {'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
        {'base':'lj','letters':/[\u01C9]/g},
        {'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
        {'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
        {'base':'nj','letters':/[\u01CC]/g},
        {'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
        {'base':'oi','letters':/[\u01A3]/g},
        {'base':'ou','letters':/[\u0223]/g},
        {'base':'oo','letters':/[\uA74F]/g},
        {'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
        {'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
        {'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
        {'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
        {'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
        {'base':'tz','letters':/[\uA729]/g},
        {'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
        {'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
        {'base':'vy','letters':/[\uA761]/g},
        {'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
        {'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
        {'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
        {'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
    ];
    var changes;
    function removeDiacritics (str) {
        if(!changes) {
            changes = defaultDiacriticsRemovalMap;
        }
        for(var i=0; i<changes.length; i++) {
            str = str.replace(changes[i].letters, changes[i].base);
        }
        return str;
    }
    function prefix_in_string(prefixes, to_check)
    {
        var j;
        for(j=0; j < prefixes.length; j++)
            if(to_check.indexOf(prefixes[j])===0) return true;
        return false;
    }
    function parse_name(to_parse)
    {
        var suffixes=["Jr","II","III","IV","CPA","CGM"];
        var split_parse=to_parse.split(" ");
        var last_pos=split_parse.length-1;
        var j;
        var caps_regex=/^[A-Z]+$/;
        var ret={};
        for(last_pos=split_parse.length-1; last_pos>=1; last_pos--)
        {
            if(!prefix_in_string(suffixes,split_parse[last_pos]) && !caps_regex.test(split_parse[last_pos])) break;

        }
        ret.lname=split_parse[last_pos];
        ret.fname=split_parse[0];
        if(last_pos>=2 && split_parse[1].length>=1)
            ret.mname=split_parse[1].substring(0,1);
        else
            ret.mname="";
        return ret;

    }
    function is_Christian_or_bad(to_check)
    {
        var christ_re=/Episcopal|(Catholic)|(Lutheran)|(^St )|(Christian (Academy|School))|(Day Care)|(Preschool)|(Jewish)|(Baptist)|(Adventist)|(Saint Luke)/;
        if(christ_re.test(to_check))
            return true;
        return false;
    }
    function do_NA()
    {
        document.getElementsByName(sch_name)[0].value="n/a";
        document.getElementsByName(sch_domain)[0].value="n/a";
        check_and_submit();
        return true;
    }
    function is_NYC()
    {
        var nyc_city_re=/Bronx|Brooklyn|(New York)|(Flushing)|(Staten Island)|(NYC)/i;
        var ps_re=/^(M|P)[\.\s]*S[\.\s]*\s*\d/i;
        if(nyc_city_re.test(my_query.city) && ps_re.test(my_query.name))
            return true;
        return false;
    }
    function init_FindDist()
    {
        var wT=document.getElementById("DataCollection").getElementsByTagName("table")[0];

        my_query={name: wT.rows[0].cells[1].innerText, address: wT.rows[1].cells[1].innerText, city: wT.rows[2].cells[1].innerText,
                 state: wT.rows[3].cells[1].innerText};
       /* if(my_query.company.length==0){
            my_query.company=my_query.fname+" "+my_query.lname+" lawyer";
        }*/


        console.log("my_query="+JSON.stringify(my_query));
        first_try=true;

        if(is_Christian_or_bad(my_query.name))
        {
            do_NA();
            return true;
        }
        if(is_NYC())
        {
            document.getElementsByName(sch_name)[0].value="New York City Department of Education";
            document.getElementsByName(sch_domain)[0].value="schools.nyc.gov";
            check_and_submit();
            return true;
        }

        var search_str, search_URI, search_URIBing;

        const distPromise = new Promise((resolve, reject) => {
            console.log("Beginning dist search");
            dist_search(resolve, reject);
        });
        distPromise.then(dist_promise_then
        )
        .catch(function(val) {
           console.log("Failed dist " + val);   GM_setValue("returnHit",true); });





    }

    /* Failsafe to stop it  */
    window.addEventListener("keydown",function(e) {
        if(e.key !== "F1") {
            return;
        }
        GM_setValue("stop",true);
     });


    if (window.location.href.indexOf("mturkcontent.com") != -1 || window.location.href.indexOf("amazonaws.com") != -1)
    {
        var submitButton=document.getElementById("submitButton");
        if(!submitButton.disabled )
        {

            init_FindDist();
        }

    }
    else
    {
       // console.log("In LuisQuintero main");
        if(automate)
            setTimeout(function() { btns_secondary[0].click(); }, 15000);
        GM_setValue("returnHit",false);
       GM_addValueChangeListener("returnHit", function() {
                if(GM_getValue("returnHit")!==undefined && GM_getValue("returnHit")===true &&
                  btns_secondary!==undefined && btns_secondary.length>0 && btns_secondary[0].innerText==="Return"
                  )
                {
                    if(automate)
                        setTimeout(function() { btns_secondary[0].click(); }, 0);
                }
            });
         /* Regular window at mturk */
        var btns_primary=document.getElementsByClassName("btn-primary");
        var btns_secondary=document.getElementsByClassName("btn-secondary");
        if(GM_getValue("stop") !== undefined && GM_getValue("stop") === true)
        {
        }
        else if(btns_secondary!==undefined && btns_secondary.length>0 && btns_secondary[0].innerText==="Skip" &&
               btns_primary!==undefined && btns_primary.length>0 && btns_primary[0].innerText==="Accept")
        {

            /* Accept the HIT */
            if(automate)
                btns_primary[0].click();
        }
        else
        {
            /* Wait to return the hit */
            console.log("MOO");
            var cboxdiv=document.getElementsByClassName("checkbox");
            var cbox=cboxdiv[0].firstChild.firstChild;
            if(cbox.checked===false) cbox.click();
        }

    }


})();