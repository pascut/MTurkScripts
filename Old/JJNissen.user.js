// ==UserScript==
// @name         JJNissen2
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Script to Figure out where and what be-eth emailstars
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
// @grant GM_getResourceText
// @grant GM_addStyle
// @connect google.com
// @connect bing.com
// @connect yellowpages.com
// @connect *
// @require https://raw.githubusercontent.com/hassansin/parse-address/master/parse-address.min.js
// @require https://raw.githubusercontent.com/jacobmas/MTurkScripts/master/jacobsscriptfuncs.js
// @resource GlobalCSS https://raw.githubusercontent.com/jacobmas/MTurkScripts/master/global/globalcss.css
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
    var bad_urls=["bloomberg.com","glassdoor.com","facebook.com","linkedin.com","crunchbase.com","pitchbook.com","fortune.com","buzzfile.com",
                 "bizapedia.com","indeed.com","investopedia.com","hoovers.com","livecareer.com"];
    var country_domains=[".ar",".at",".au",".br",".ch",".cn",".de",".eu",".fr",".it",".jp",".ro",".ru",".se",".tw",".uk",".uy",".vn"];
    var first_try=true;
    var domain_map={"mayoclinic.org": "mayo.edu", "fda.gov": "fda.hhs.gov"};

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

       //  document.getElementsByName("Founder Name")[0].value=my_query.name;
        //document.getElementsByName("Linkedin")[0].value=my_query.linkedin_url;
        console.log("Checking and submitting");

           if(GM_getValue("automate"))
        {
            setTimeout(function() { document.getElementById("submitButton").click(); }, 500);
        }
    }


    function my_parse_address(to_parse)
    {
        var ret_add={};
        var state_re=/([A-Za-z]+) ([\d\-]+)$/;
        var canada_zip=/ ([A-Z]{2}) ([A-Z][\d][A-Z] [\d][A-Z][\d])$/;
        to_parse=to_parse.replace(canada_zip,", $&");

        console.log("to_parse="+to_parse);
        var my_match;
        var splits=to_parse.split(",");
        if(splits.length===3)
        {
            if(canada_zip.test(splits[2]))
            {
                my_match=splits[2].match(canada_zip);
                ret_add.state=my_match[1];
                ret_add.zip=my_match[2];
            }
            else
            {
                my_match=splits[2].match(state_re);
                if(my_match!==null && my_match!==undefined)
                {
                    ret_add.state=my_match[1];
                    ret_add.zip=my_match[2];
                }
            }
            ret_add.street=splits[0].trim();
            ret_add.city=splits[1].trim();
        }
        else if(splits.length==2)
        {

            if(canada_zip.test(splits[1]))
            {
                my_match=splits[1].match(canada_zip);
                ret_add.state=my_match[1];
                ret_add.zip=my_match[2];
            }
            else
            {
                my_match=splits[1].match(state_re);
                if(my_match!==null && my_match!==undefined)
                {
                    ret_add.state=my_match[1];
                    ret_add.zip=my_match[2];
                }
            }
            ret_add.street="";
            ret_add.city=splits[0].trim();
        }
        if(ret_add.city===undefined || ret_add.state===undefined || ret_add.zip===undefined)
        {
            to_parse=to_parse.replace(/\, ([\d]{5})\,? ([A-Z]{2})/, ", $2 $1");
            console.log("to_parse="+to_parse);
            var new_add=parseAddress.parseLocation(to_parse);
            ret_add.street="";
            if(new_add.number!==undefined)
            {
                ret_add.street=ret_add.street+new_add.number+" ";
            }
            ret_add.street=ret_add.street+new_add.street+" ";
            if(new_add.type!==undefined)
            {
                ret_add.street=ret_add.street+new_add.type;
            }
            ret_add.street=ret_add.street.trim();
            ret_add.city=new_add.city;
            ret_add.state=new_add.state;
            if(new_add.zip!==undefined) { ret_add.zip=new_add.zip; }
            else { ret_add.zip=""; }
            console.log("new_add="+JSON.stringify(new_add));
        }
        return ret_add;
    }



    /* Get the marketer linkedin */

    function parse_domain(t_url)
    {
        var new_url=t_url.replace(/\/$/,"").replace(/^https?:\/\//,"").replace(/^www\./,"").replace(/\/.*$/,"");
        new_url=new_url.replace(/ ›.*$/,"");
        console.log("t_url="+t_url+"\nnew_url="+new_url);
        var split_dots=new_url.split(".");
        var split_len=split_dots.length;
        var ret="";
        if(split_len>=3&&country_domains.includes(split_dots[split_len-1]))
        {
            ret=split_dots[split_len-3]+"."+split_dots[split_len-2]+"."+split_dots[split_len-1];
        }
        else
        {
            ret=split_dots[split_len-2]+"."+split_dots[split_len-1];
        }


        if(ret in domain_map)
        {
            ret=domain_map[ret];
        }

        return ret;
    }




 

    function founderlinkedin_response(response,resolve,reject,index) {
        // console.log(JSON.stringify(response));
        var doc = new DOMParser()
        .parseFromString(response.responseText, "text/html");

        console.log("in founderlinkedin_response, index="+index+", for "+my_query.founderList[index]);

       console.log(response.finalUrl);
        var b_algo, i, b_url="crunchbase.com", b_name, search;
        var b_factrow, b_caption;
        var b1_success=false, b_header_search, b_split;
        var b_left;
        var inner_a;

        try
        {
            search=doc.getElementById("b_content");
            b_algo=search.getElementsByClassName("b_algo");

            console.log("b_algo.length="+b_algo.length);
            if(b_algo.length===0)
            {
                console.log("b_algo length=0");
                GM_setValue("returnHit",true);
                return;
            }

            for(i=0; i < b_algo.length && i < 6; i++)
            {
                if(b_algo[i].tagName!=="LI")
                {
                    console.log("b_algo["+i+"].tagName="+b_algo[i].tagName);
                    continue;
                }
                b_name=b_algo[i].getElementsByTagName("a")[0].textContent.trim();
                b_url=b_algo[i].getElementsByTagName("a")[0].href;
                b_left=b_name.split("|")[0].trim();
                b_split=b_left.split("-");

                console.log("b_name="+b_name+"\nb_url="+b_url);
                var query_name=parse_name(b_split[0].trim()), founder_name=parse_name(my_query.founderList[index]);
                console.log("query_name="+JSON.stringify(query_name)+"\tfounder_name="+JSON.stringify(founder_name)+", i="+i);
                if(b_url.indexOf("/in/")!==-1 && (b_name.toLowerCase().indexOf(my_query.founderList[index].toLowerCase().trim())!==-1
                                                  ||( query_name.lname.toLowerCase()===founder_name.lname.toLowerCase() && i<=1)

                 ||(query_name.lname.toLowerCase()===founder_name.lname.toLowerCase() &&
                     query_name.fname.toLowerCase()===founder_name.fname.toLowerCase() && i>=0)
                                                 ))


                {
                   // my_query.name=my_query.founderList[i].trim();
                    my_query.founderUrl[index]=b_url;
//                    my_query.linkedin_url=b_url;
                    console.log("Resolving");
                    resolve(index);
                    return;

                }



            }


        }
        catch(error)
        {

            //console.log("Error "+error);
            reject("Error is "+ error);
        }
          my_query.foundersTried++;
        reject("Could not find Linkedin for "+my_query.founderList[index]);
    }

    function linkedin_response(response,resolve,reject) {
        // console.log(JSON.stringify(response));
        var doc = new DOMParser()
        .parseFromString(response.responseText, "text/html");

        console.log("in linkedin_response");

       console.log(response.finalUrl);
        var b_algo, i, b_url="crunchbase.com", b_name, search;
        var b_factrow, b_caption;
        var b1_success=false, b_header_search, b_split;
        var b_left;
        var inner_a;

        try
        {
            search=doc.getElementById("b_content");
            b_algo=search.getElementsByClassName("b_algo");

            console.log("b_algo.length="+b_algo.length);
            if(b_algo.length===0)
            {
                console.log("b_algo length=0");
                GM_setValue("returnHit",true);
                return;
            }

            for(i=0; i < b_algo.length && i < 6; i++)
            {
                if(b_algo[i].tagName!=="LI")
                {
                    console.log("b_algo["+i+"].tagName="+b_algo[i].tagName);
                    continue;
                }
                b_name=b_algo[i].getElementsByTagName("a")[0].textContent;
                b_url=b_algo[i].getElementsByTagName("a")[0].href;
                b_left=b_name.split("|")[0].trim();
                b_split=b_left.split("-");

                console.log("b_name="+b_name+"\nb_url="+b_url);

                if(b_url.indexOf("/in/")!==-1 && (/Title:.*CEO/.test(b_algo[i].innerText) || /CEO|Founder|President|Chief Executive/i.test(b_name)
                                                 || new RegExp("CEO "+my_query.orgname).test(b_algo[i].innerText)
                                                 )

                )
                {
                    my_query.name=b_split[0].replace(/,.*$/,"").replace(/^Dr\.\s*/,"").trim();
                    my_query.linkedin_url=b_url;
                    resolve(b_split);
                    return;

                }



            }


        }
        catch(error)
        {

            //console.log("Error "+error);
            reject("Error is "+ error);
        }
        reject("Could not find a domain");
    }


    function founderlinkedin_promise_then(index)
    {
        console.log("result="+index);

        var search_str, search_URI, search_URIBing;

        my_query.email="";
        my_query.phone="";
        my_query.doneGuessEmail=false;
        my_query.doneParsePage=false;
       // my_query.submitted=false;

     //   document.getElementsByName("Founder Name")[0].value=my_query.name;
       // document.getElementsByName("Linkedin")[0].value=my_query.linkedin_url;

        my_query.fullname=parse_name(removeDiacritics(my_query.founderList[index].trim()));
        my_query.fname=my_query.fullname.fname;
        my_query.mname=my_query.fullname.mname;
        my_query.lname=my_query.fullname.lname;

        const guessEmailPromise=new Promise((resolve, reject) => {
            email_search(resolve, reject,index);
        })

        .then(guess_email_then)
        .catch(function(val) {

           console.log("Failed at email guess " + val); my_query.doneGuessEmail=true;
            if(my_query.doneGuessEmail && my_query.email.length===0 &&!my_query.submitted)
            {
                if(my_query.foundersTried<my_query.founderList.length)
                {
                    my_query.foundersTried++;
                    console.log("my_query.foundersTried="+my_query.foundersTried);
                    if(my_query.foundersTried===my_query.founderList.length)
                    {
                        console.log("Generic linkedin");
                        const linkedinPromise = new Promise((resolve, reject) => {
                            console.log("Beginning linkedin search");
                            search_str=my_query.orgname+" CEO site:linkedin.com";//+" company";
                            query_search(search_str,resolve, reject,linkedin_response);
                        });
                        linkedinPromise.then(linkedin_promise_then
                                            )
                            .catch(function(val) {
                            console.log("Failed at this linkedin " + val); GM_setValue("returnHit",true); });

                    }
                    return;
                }
                console.log("Returning");
                GM_setValue("returnHit",true);
                return;
            }
            else if(my_query.doneGuessEmail && !my_query.submitted)
            {
                my_query.submitted=true;
                check_and_submit();
                return;
            }

        } );

    }

    function linkedin_promise_then(result)
    {
        console.log("result="+result);

        var search_str, search_URI, search_URIBing;

        my_query.email="";
        my_query.phone="";
        my_query.doneGuessEmail=false;
        my_query.doneParsePage=false;
       // my_query.submitted=false;

        document.getElementsByName("Founder Name")[0].value=my_query.name;
        document.getElementsByName("Linkedin")[0].value=my_query.linkedin_url;

        my_query.fullname=parse_name(removeDiacritics(my_query.name));
        my_query.fname=my_query.fullname.fname;
        my_query.mname=my_query.fullname.mname;
        my_query.lname=my_query.fullname.lname;

        const guessEmailPromise=new Promise((resolve, reject) => {
            email_search(resolve, reject);
        })

        .then(guess_email_then)
        .catch(function(val) {

           console.log("Failed at email guess " + val); my_query.doneGuessEmail=true;
            if(my_query.doneGuessEmail && my_query.email.length===0 &&!my_query.submitted)
            {
                if(my_query.foundersTried<my_query.founderList.length)
                {
                    my_query.foundersTried++;
                    console.log("my_query.foundersTried="+my_query.foundersTried);
                    if(my_query.foundersTried===my_query.founderList.length)
                    {
                        console.log("Generic linkedin");
                        const linkedinPromise = new Promise((resolve, reject) => {
                            console.log("Beginning linkedin search");
                            search_str=my_query.orgname+" CEO site:linkedin.com";//+" company";
                            query_search(search_str,resolve, reject,linkedin_response);
                        });
                        linkedinPromise.then(linkedin_promise_then
                                            )
                            .catch(function(val) {
                            console.log("Failed at this linkedin " + val); GM_setValue("returnHit",true); });

                    }
                    return;
                }
                console.log("Returning");
                GM_setValue("returnHit",true);
                return;
            }
            else if(my_query.doneGuessEmail && !my_query.submitted)
            {
                my_query.submitted=true;
                check_and_submit();
                return;
            }

        } );

    }


  function query_search(search_str, resolve,reject, callback,i) {
        console.log("Searching with bing for "+search_str);
        var search_URIBing='https://www.bing.com/search?q='+encodeURIComponent(search_str)+"&first=1&rdr=1";
        var domain_URL='https://www.google.com/search?q='+encodeURIComponent(search_str);//+" company");
        GM_xmlhttpRequest({
            method: 'GET',
            url:    search_URIBing,

            onload: function(response) {
                //   console.log("On load in crunch_response");
                //    crunch_response(response, resolve, reject);
                callback(response, resolve, reject,i);
            },
            onerror: function(response) { reject("Fail"); },
            ontimeout: function(response) { reject("Fail"); }


        });
    }


        /* Following finding the name of the company */




    function guess_email_then(index)
    {
        console.log("\t\tIn guess_email_then: "+index+"\n\n");
        my_query.doneGuessEmail=true;
        add_to_sheet(index);

        if(my_query.email.length>0 && !my_query.submitted)
        {
            my_query.submitted=true;
            check_and_submit();
            return;
        }
        else if(my_query.email.length===0)
        {
            GM_setValue("returnHit",true);
        }
    }

    function email_search(resolve, reject,index)
    {

        var search_str="";
        var fname=my_query.fname, lname=my_query.lname.replace(/\'/g,""), mname=my_query.mname;
        search_str=search_str+"\""+fname+"."+lname+"@"+my_query.domain+"\"";
        search_str=search_str+" OR \""+fname.substr(0,1)+lname+"@"+my_query.domain+"\"";
        search_str=search_str+" OR \""+fname+lname+"@"+my_query.domain+"\"";
        search_str=search_str+" OR \""+lname+"."+fname+"@"+my_query.domain+"\"";
        search_str=search_str+" OR \""+fname+"."+mname.substr(0,1)+"."+lname+"@"+my_query.domain+"\"";
        search_str=search_str+" OR \""+fname+"@"+my_query.domain+"\"" +" -site:lead411.com";

        console.log("Email search_str="+search_str);
        var search_URI='https://www.google.com/search?q='+encodeURIComponent(search_str);//+"?ei=tuC2Wu9awZ3nApPrpOgB";
        if(!my_query.submitted)
        {
            GM_xmlhttpRequest({
                method: 'GET',
                url:    search_URI,

                onload: function(response) {
                    console.log("Beginning Google search for emails\nURI="+search_URI);
                    //google3_response(response, my_query);
                    if(!my_query.submitted)
                    {
                        email_response(response, resolve, reject,index);
                    }
                }

            });
        }
    }

    function is_good_email(the_email,index)
    {
        the_email=the_email.toLowerCase();
        console.log("the_email="+the_email)


        var fname=my_query.fname.toLowerCase(),mname=my_query.mname.toLowerCase(),lname=my_query.lname.toLowerCase(), domain=my_query.domain.toLowerCase();
        if(index!==undefined && index!==null)
        {
            var fullname=parse_name(removeDiacritics(my_query.founderList[index].trim()));
            fname=fullname.fname.toLowerCase();
            mname=fullname.mname.toLowerCase();
            lname=fullname.lname.toLowerCase();
        }
        console.log("fname="+fname+", lname="+lname+", the_email="+the_email);
        if(the_email.indexOf(fname)!==-1 || the_email.indexOf(lname)!==-1)
        {
            console.log("is good");
            return true;
        }
        return false;
    }


    function email_response(response,resolve, reject,index) {
        //console.log(JSON.stringify(response));
        console.log("In email response");
        var doc = new DOMParser()
        .parseFromString(response.responseText, "text/html");

        var search, g_stuff;
        try
        {
            search=doc.getElementById("search");


            g_stuff=search.getElementsByClassName("g");
        }
        catch(error)
        {
            console.log("Error blorp "+error);
            reject("Failed");
            return;
        }
        var i,j;
        var my_match;
        var g1_success=false;
        var t_url="", t_header_search="", t_slp, t_st;
        for(i=0; i < g_stuff.length; i++)
        {
            try
            {
                console.log("g_stuff["+i+"]="+g_stuff[i]);
                t_url=g_stuff[i].getElementsByTagName("a")[0].href; // url of query
                if(g_stuff[i].getElementsByClassName("r").length>0)
                {

                    t_header_search=g_stuff[i].getElementsByClassName("r")[0].innerText; // basic description
                }
                else t_header_search="";

                t_slp=g_stuff[i].getElementsByClassName("slp");
                if(g_stuff[i].getElementsByClassName("st").length>0)
                {
                    t_st=g_stuff[i].getElementsByClassName("st")[0].innerText;
                }
                else t_st="";
                console.log("t_st="+t_st);


                my_match=t_st.match(email_re);
                if(t_url.indexOf("email-verifier.io")!==-1 || t_url.indexOf("dabot.io")!==-1) continue;
                console.log("t_url["+i+"]="+t_url);


                console.log("t_header_search="+t_header_search);
                if(my_match !== null) { console.log("my_match[0].split(\"@\")[1].toLowerCase()="+my_match[0].split("@")[1].toLowerCase()); }
                for(j=0; my_match !== null && j < my_match.length; j++) {
                    if(my_match !== null && my_match.length>0 && my_match[j].split("@")[1].toLowerCase()===my_query.domain.toLowerCase() && is_good_email(my_match[j],index))
                    {
                        if(my_query.email.length===0)
                        {
                            my_query.email=my_match[j];

                            console.log("Guessed email="+my_match[j]+", index="+index);

                            /* Try to find phone at same site */

                            g1_success=true;
                            break;



                        }
                    }
                }
                if(g1_success) break;
            }
            catch(error)
            {
                console.log("Failed email response"+error);
                 reject("Failed email_response");
                return;
            }

        }
        if(g1_success)
        {
            resolve(index);
        }
        else
        {
            console.log("Failed");
            reject("Failed email_response");

        }
    }



    function add_to_sheet(index)
    {

        document.getElementsByName("Founder Email")[0].value=my_query.email;
        if(index!==undefined && index!==null)
        {
        console.log("my_query.founderList="+JSON.stringify(my_query.founderList));
        console.log("my_query.founderUrl="+JSON.stringify(my_query.founderUrl));

            document.getElementsByName("Founder Name")[0].value=my_query.founderList[index].trim();
           document.getElementsByName("Linkedin")[0].value=my_query.founderUrl[index].trim();
        }


    }






    function init_Query()
    {
        var wT=document.getElementById("DataCollection").getElementsByTagName("table")[0];
        var search_str,i;
        document.getElementById("web_url").value="";
        document.getElementsByName("Founder Email")[0].value="";
        document.getElementsByName("Linkedin")[0].value="";


        my_query={domain:get_domain_only(wT.rows[1].cells[1].innerText.replace(/`/g,"")).replace(/^(.*\.)([^\.]+\.[^\.]+)$/,"$2"),
                  crunchbase_url: wT.rows[2].cells[1].innerText,
                  founders: wT.rows[3].cells[1].innerText,
                  orgname: wT.rows[0].cells[1].innerText,foundersTried:0,triedListed:false,submitted:false};

        if(my_query.founders.length>0)
        {
            my_query.founderList=my_query.founders.split(/,\s*/);
            my_query.founderUrl=[];
            for(i=0; i < my_query.founderList.length; i++) my_query.founderUrl.push("");
        }
        else
        {
            my_query.founderList=[];
            console.log("Generic linkedin");
            const linkedinPromise = new Promise((resolve, reject) => {
                console.log("Beginning linkedin search");
                search_str=my_query.orgname+" CEO site:linkedin.com";//+" company";
                query_search(search_str,resolve, reject,linkedin_response);
            });
            linkedinPromise.then(linkedin_promise_then
                                )
                .catch(function(val) {
                console.log("Failed at this final linkedin " + val); GM_setValue("returnHit",true); });
        }

       console.log("my_query="+JSON.stringify(my_query));

        
        for(i=0; i < my_query.founderList.length; i++)
        {
            const foundlinkedinPromise = new Promise((resolve, reject) => {
                console.log("Beginning linkedin search");
                search_str=my_query.founderList[i]+" "+my_query.orgname+" site:linkedin.com";//+" company";
                query_search(search_str,resolve, reject,founderlinkedin_response,i);
            });
            foundlinkedinPromise.then(founderlinkedin_promise_then)
            .catch(function(val) {
                if(my_query.foundersTried===my_query.founderList.length)
                {
                    console.log("Generic linkedin");
                    const linkedinPromise = new Promise((resolve, reject) => {
                        console.log("Beginning linkedin search");
                        search_str=my_query.orgname+" CEO site:linkedin.com";//+" company";
                        query_search(search_str,resolve, reject,linkedin_response);
                    });
                    linkedinPromise.then(linkedin_promise_then
                                        )
                        .catch(function(val) {
                        console.log("Failed at this final linkedin " + val); GM_setValue("returnHit",true); });
                }
            });


        }
       /* const companyPromise = new Promise((resolve, reject) => {
            console.log("Beginning company search");
            search_str=my_query.orgname;//+" company";
            query_search(search_str,resolve, reject,company_response);
        });
        companyPromise.then(company_promise_then
        )
        .catch(function(val) {
           console.log("Failed at this company " + val); my_query.doneCompany=true; });*/



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

            init_Query();
        }

    }
    else if(window.location.href.indexOf("mturk.com")!==-1)
    {

        /* Should be MTurk itself */
        var globalCSS = GM_getResourceText("globalCSS");
        GM_addStyle(".btn-ternary { border: 1px solid #FA7070; background-color: #FA7070; color: #111111; }");
        var pipeline=document.getElementsByClassName("work-pipeline-action")[0];
        if(GM_getValue("automate")===undefined) GM_setValue("automate",false);

        var btn_span=document.createElement("span");
        var btn_automate=document.createElement("button");

        var btns_primary=document.getElementsByClassName("btn-primary");
        var btns_secondary=document.getElementsByClassName("btn-secondary");
        var my_secondary_parent=pipeline.getElementsByClassName("btn-secondary")[0].parentNode;
        btn_automate.className="btn btn-ternary m-r-sm";
        btn_automate.innerHTML="Automate";
        btn_span.appendChild(btn_automate);
        pipeline.insertBefore(btn_span, my_secondary_parent);
        GM_addStyle(globalCSS);
        if(GM_getValue("automate"))
        {
            btn_automate.innerHTML="Stop";
            /* Return automatically if still automating */
            setTimeout(function() {

                if(GM_getValue("automate")) btns_secondary[0].click();
            }, 20000);
        }
        btn_automate.addEventListener("click", function(e) {
            var auto=GM_getValue("automate");
            if(!auto) btn_automate.innerHTML="Stop";
            else btn_automate.innerHTML="Automate";
            GM_setValue("automate",!auto);
        });
        GM_setValue("returnHit",false);
        GM_addValueChangeListener("returnHit", function() {
            if(GM_getValue("returnHit")!==undefined && GM_getValue("returnHit")===true &&
               btns_secondary!==undefined && btns_secondary.length>0 && btns_secondary[0].innerText==="Return"
              )
            {
                if(GM_getValue("automate")) {
                    setTimeout(function() { btns_secondary[0].click(); }, 0); }
            }
        });
        /* Regular window at mturk */


        if(GM_getValue("stop") !== undefined && GM_getValue("stop") === true)
        {
        }
        else if(btns_secondary!==undefined && btns_secondary.length>0 && btns_secondary[0].innerText==="Skip" &&
                btns_primary!==undefined && btns_primary.length>0 && btns_primary[0].innerText==="Accept")
        {

            /* Accept the HIT */
            if(GM_getValue("automate")) {
                btns_primary[0].click(); }
        }
        else
        {
            /* Wait to return the hit */
            var cboxdiv=document.getElementsByClassName("checkbox");
            var cbox=cboxdiv[0].firstChild.firstChild;
            if(cbox.checked===false) cbox.click();
        }

    }


})();
