{
 "patcher": {
  "fileversion": 1,
  "appversion": {
   "major": 9,
   "minor": 1,
   "revision": 0,
   "architecture": "x64",
   "modernui": 1
  },
  "classnamespace": "box",
  "rect": [
   60.0,
   100.0,
   1100.0,
   800.0
  ],
  "openrect": [
   0.0,
   0.0,
   700.0,
   169.0
  ],
  "openrectmode": 0,
  "openinpresentation": 1,
  "default_fontsize": 10.0,
  "default_fontname": "Arial Bold",
  "gridsize": [
   8.0,
   8.0
  ],
  "boxanimatetime": 500,
  "devicewidth": 700.0,
  "parameters": {
   "pattr": [
    "sndwrks Mappings",
    "maps",
    0
   ],
   "tabMode": [
    "sndwrks Edit Layer",
    "layer",
    0
   ],
   "bSet": [
    "sndwrks Store",
    "store",
    0
   ],
   "bDel": [
    "sndwrks Delete",
    "delete",
    0
   ],
   "bLearn": [
    "sndwrks MIDI Learn",
    "learn",
    0
   ],
   "bTransport": [
    "sndwrks Transport",
    "transport",
    0
   ],
   "parameterbanks": {
    "0": {
     "index": 0,
     "name": "",
     "parameters": [
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      "-"
     ],
     "buttons": [
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      "-"
     ]
    }
   },
   "inherited_shortname": 1
  },
  "latency": 0,
  "is_mpe": 0,
  "external_mpe_tuning_enabled": 0,
  "minimum_live_version": "",
  "minimum_max_version": "",
  "platform_compatibility": 0,
  "project": {
   "version": 1,
   "creationdate": 3871384390,
   "modificationdate": 3871384390,
   "viewrect": [
    0.0,
    0.0,
    300.0,
    500.0
   ],
   "autoorganize": 1,
   "hideprojectwindow": 1,
   "showdependencies": 1,
   "autolocalize": 0,
   "contents": {
    "patchers": {}
   },
   "layout": {},
   "searchpath": {},
   "detailsvisible": 0,
   "amxdtype": 1835887981,
   "readonly": 0,
   "devpathtype": 0,
   "devpath": ".",
   "sortmode": 0,
   "viewmode": 0,
   "includepackages": 0
  },
  "autosave": 0,
  "saved_attribute_attributes": {
   "default_plcolor": {
    "expression": ""
   }
  },
  "oscreceiveudpport": 0,
  "boxes": [
   {
    "box": {
     "id": "midiin",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      30.0,
      60.0,
      45.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "midiin"
    }
   },
   {
    "box": {
     "id": "midiout",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      760.0,
      60.0,
      52.0,
      22.0
     ],
     "text": "midiout"
    }
   },
   {
    "box": {
     "id": "mparse",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 8,
     "patching_rect": [
      30.0,
      100.0,
      300.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
     ],
     "text": "midiparse"
    }
   },
   {
    "box": {
     "id": "unpack",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      30.0,
      140.0,
      78.0,
      22.0
     ],
     "outlettype": [
      "",
      ""
     ],
     "text": "unpack 0 0"
    }
   },
   {
    "box": {
     "id": "neq",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      170.0,
      180.0,
      32.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "!= 0"
    }
   },
   {
    "box": {
     "id": "plus",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      170.0,
      215.0,
      32.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "+ 1"
    }
   },
   {
    "box": {
     "id": "gate2",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 2,
     "patching_rect": [
      30.0,
      255.0,
      130.0,
      22.0
     ],
     "outlettype": [
      "",
      ""
     ],
     "text": "gate 2"
    }
   },
   {
    "box": {
     "id": "colloff",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 4,
     "patching_rect": [
      30.0,
      300.0,
      215.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      "",
      ""
     ],
     "text": "coll sndwrks_noteoff",
     "saved_object_attributes": {
      "precision": 6
     }
    }
   },
   {
    "box": {
     "id": "collon",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 4,
     "patching_rect": [
      270.0,
      300.0,
      210.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      "",
      ""
     ],
     "text": "coll sndwrks_noteon",
     "saved_object_attributes": {
      "precision": 6
     }
    }
   },
   {
    "box": {
     "id": "rsym",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      30.0,
      345.0,
      110.0,
      22.0
     ],
     "outlettype": [
      "",
      ""
     ],
     "text": "route symbol"
    }
   },
   {
    "box": {
     "id": "fsym",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      30.0,
      385.0,
      90.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "fromsymbol"
    }
   },
   {
    "box": {
     "id": "udp",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      30.0,
      430.0,
      190.0,
      22.0
     ],
     "text": "udpsend 127.0.0.1 52000"
    }
   },
   {
    "box": {
     "id": "dbg",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      250.0,
      430.0,
      160.0,
      22.0
     ],
     "text": "print sndwrks-out"
    }
   },
   {
    "box": {
     "id": "gateT",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 2,
     "patching_rect": [
      30.0,
      400.0,
      130.0,
      22.0
     ],
     "outlettype": [
      "",
      ""
     ],
     "text": "gate 2"
    }
   },
   {
    "box": {
     "id": "tplus",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      170.0,
      365.0,
      32.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "+ 1"
    }
   },
   {
    "box": {
     "id": "node",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      250.0,
      470.0,
      250.0,
      22.0
     ],
     "outlettype": [
      "",
      ""
     ],
     "text": "node.script sndwrksTcp.js @autostart 1"
    }
   },
   {
    "box": {
     "id": "learngate",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      520.0,
      180.0,
      60.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "gate"
    }
   },
   {
    "box": {
     "id": "prepsel",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      520.0,
      215.0,
      130.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "prepend selectnote"
    }
   },
   {
    "box": {
     "id": "js",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 9,
     "patching_rect": [
      30.0,
      560.0,
      200.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
     ],
     "text": "js sndwrksMap.js"
    }
   },
   {
    "box": {
     "id": "fson",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      30.0,
      600.0,
      90.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "fromsymbol"
    }
   },
   {
    "box": {
     "id": "fsoff",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      140.0,
      600.0,
      90.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "fromsymbol"
    }
   },
   {
    "box": {
     "id": "pattr",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 3,
     "patching_rect": [
      240.0,
      610.0,
      260.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      ""
     ],
     "text": "pattr sndwrksMappings",
     "saved_object_attributes": {
      "parameter_enable": 1
     },
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "sndwrks Mappings",
       "parameter_shortname": "maps",
       "parameter_type": 3,
       "parameter_invisible": 1,
       "parameter_initial_enable": 0
      }
     },
     "varname": "sndwrksMappings"
    }
   },
   {
    "box": {
     "id": "lb",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      700.0,
      500.0,
      62.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "loadbang"
    }
   },
   {
    "box": {
     "id": "thisdev",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 3,
     "patching_rect": [
      760.0,
      500.0,
      110.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      ""
     ],
     "text": "live.thisdevice"
    }
   },
   {
    "box": {
     "id": "msginit",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      700.0,
      560.0,
      40.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "init"
    }
   },
   {
    "box": {
     "id": "msgbangT",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      700.0,
      590.0,
      44.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "bang"
    }
   },
   {
    "box": {
     "id": "logo",
     "maxclass": "v8ui",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      140.0,
      690.0,
      40.0,
      159.0
     ],
     "outlettype": [
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      12.0,
      6.0,
      40.0,
      159.0
     ],
     "filename": "sndwrksLogo.js",
     "ignoreclick": 1
    }
   },
   {
    "box": {
     "id": "grid",
     "maxclass": "v8ui",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      300.0,
      690.0,
      180.0,
      122.0
     ],
     "outlettype": [
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      60.0,
      6.0,
      180.0,
      122.0
     ],
     "filename": "sndwrksGrid.js"
    }
   },
   {
    "box": {
     "id": "lblHost",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      300.0,
      790.0,
      200.0,
      18.0
     ],
     "text": "S E R V E R",
     "fontsize": 9.0,
     "fontname": "Ableton Sans",
     "textcolor": [
      0.62,
      0.62,
      0.64,
      1.0
     ],
     "presentation": 1,
     "presentation_rect": [
      60.0,
      132.0,
      114.0,
      11.0
     ]
    }
   },
   {
    "box": {
     "id": "teHost",
     "maxclass": "textedit",
     "numinlets": 1,
     "numoutlets": 3,
     "patching_rect": [
      300.0,
      812.0,
      192.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      60.0,
      145.0,
      114.0,
      20.0
     ],
     "bgcolor": [
      0.118,
      0.118,
      0.125,
      1.0
     ],
     "textcolor": [
      0.94,
      0.94,
      0.95,
      1.0
     ],
     "fontsize": 11,
     "fontname": "Ableton Sans",
     "rounded": 3,
     "outputmode": 1
    }
   },
   {
    "box": {
     "id": "rtHost",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      300.0,
      842.0,
      90.0,
      22.0
     ],
     "outlettype": [
      "",
      ""
     ],
     "text": "route text"
    }
   },
   {
    "box": {
     "id": "prepHost",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      300.0,
      872.0,
      110.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "prepend host"
    }
   },
   {
    "box": {
     "id": "lblPort",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      300.0,
      790.0,
      120.0,
      18.0
     ],
     "text": "P O R T",
     "fontsize": 9.0,
     "fontname": "Ableton Sans",
     "textcolor": [
      0.62,
      0.62,
      0.64,
      1.0
     ],
     "presentation": 1,
     "presentation_rect": [
      178.0,
      132.0,
      62.0,
      11.0
     ]
    }
   },
   {
    "box": {
     "id": "tePort",
     "maxclass": "textedit",
     "numinlets": 1,
     "numoutlets": 3,
     "patching_rect": [
      300.0,
      812.0,
      90.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      178.0,
      145.0,
      62.0,
      20.0
     ],
     "bgcolor": [
      0.118,
      0.118,
      0.125,
      1.0
     ],
     "textcolor": [
      0.94,
      0.94,
      0.95,
      1.0
     ],
     "fontsize": 11,
     "fontname": "Ableton Sans",
     "rounded": 3,
     "outputmode": 1
    }
   },
   {
    "box": {
     "id": "rtPort",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      300.0,
      842.0,
      90.0,
      22.0
     ],
     "outlettype": [
      "",
      ""
     ],
     "text": "route text"
    }
   },
   {
    "box": {
     "id": "prepPort",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      300.0,
      872.0,
      100.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "prepend port"
    }
   },
   {
    "box": {
     "id": "lblNote",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      560.0,
      660.0,
      300.0,
      24.0
     ],
     "text": "C1  (36)  NOTE ON",
     "fontsize": 13.0,
     "fontname": "Ableton Sans",
     "textcolor": [
      0.94,
      0.94,
      0.95,
      1.0
     ],
     "presentation": 1,
     "presentation_rect": [
      252.0,
      8.0,
      244.0,
      22.0
     ]
    }
   },
   {
    "box": {
     "id": "tabMode",
     "maxclass": "live.tab",
     "numinlets": 1,
     "numoutlets": 3,
     "patching_rect": [
      560.0,
      690.0,
      128.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      560.0,
      8.0,
      128.0,
      22.0
     ],
     "parameter_enable": 1,
     "fontname": "Ableton Sans",
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_enum": [
        "note on",
        "note off"
       ],
       "parameter_longname": "sndwrks Edit Layer",
       "parameter_shortname": "layer",
       "parameter_mmax": 1,
       "parameter_type": 2,
       "parameter_invisible": 1
      }
     }
    }
   },
   {
    "box": {
     "id": "prepmode",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      560.0,
      720.0,
      120.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "prepend setmode"
    }
   },
   {
    "box": {
     "id": "lblAddr",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      560.0,
      760.0,
      200.0,
      18.0
     ],
     "text": "O S C   A D D R E S S",
     "fontsize": 9.0,
     "fontname": "Ableton Sans",
     "textcolor": [
      0.62,
      0.62,
      0.64,
      1.0
     ],
     "presentation": 1,
     "presentation_rect": [
      252.0,
      38.0,
      200.0,
      15.0
     ]
    }
   },
   {
    "box": {
     "id": "teAddr",
     "maxclass": "textedit",
     "numinlets": 1,
     "numoutlets": 3,
     "patching_rect": [
      560.0,
      782.0,
      400.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      252.0,
      54.0,
      436.0,
      22.0
     ],
     "bgcolor": [
      0.118,
      0.118,
      0.125,
      1.0
     ],
     "textcolor": [
      0.94,
      0.94,
      0.95,
      1.0
     ],
     "fontsize": 11,
     "fontname": "Ableton Sans",
     "rounded": 3,
     "outputmode": 1
    }
   },
   {
    "box": {
     "id": "prepaddr",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      560.0,
      812.0,
      120.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "prepend address"
    }
   },
   {
    "box": {
     "id": "lblArgs",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      560.0,
      846.0,
      200.0,
      18.0
     ],
     "text": "A R G U M E N T S",
     "fontsize": 9.0,
     "fontname": "Ableton Sans",
     "textcolor": [
      0.62,
      0.62,
      0.64,
      1.0
     ],
     "presentation": 1,
     "presentation_rect": [
      252.0,
      82.0,
      200.0,
      15.0
     ]
    }
   },
   {
    "box": {
     "id": "teArgs",
     "maxclass": "textedit",
     "numinlets": 1,
     "numoutlets": 3,
     "patching_rect": [
      560.0,
      868.0,
      400.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      252.0,
      98.0,
      436.0,
      22.0
     ],
     "bgcolor": [
      0.118,
      0.118,
      0.125,
      1.0
     ],
     "textcolor": [
      0.94,
      0.94,
      0.95,
      1.0
     ],
     "fontsize": 11,
     "fontname": "Ableton Sans",
     "rounded": 3,
     "outputmode": 1
    }
   },
   {
    "box": {
     "id": "prepargs",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      560.0,
      898.0,
      110.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "prepend args"
    }
   },
   {
    "box": {
     "id": "bSet",
     "maxclass": "live.text",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      560.0,
      932.0,
      64.0,
      22.0
     ],
     "outlettype": [
      "",
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      252.0,
      128.0,
      64.0,
      22.0
     ],
     "parameter_enable": 1,
     "fontname": "Ableton Sans",
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_enum": [
        "store",
        "store"
       ],
       "parameter_longname": "sndwrks Store",
       "parameter_shortname": "store",
       "parameter_mmax": 1,
       "parameter_type": 2,
       "parameter_invisible": 2
      }
     },
     "text": "store",
     "texton": "store",
     "mode": 0
    }
   },
   {
    "box": {
     "id": "tset",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 3,
     "patching_rect": [
      560.0,
      962.0,
      70.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      ""
     ],
     "text": "t b b b"
    }
   },
   {
    "box": {
     "id": "msgset",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      560.0,
      995.0,
      50.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "doset"
    }
   },
   {
    "box": {
     "id": "bDel",
     "maxclass": "live.text",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      634.0,
      932.0,
      64.0,
      22.0
     ],
     "outlettype": [
      "",
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      324.0,
      128.0,
      64.0,
      22.0
     ],
     "parameter_enable": 1,
     "fontname": "Ableton Sans",
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_enum": [
        "delete",
        "delete"
       ],
       "parameter_longname": "sndwrks Delete",
       "parameter_shortname": "delete",
       "parameter_mmax": 1,
       "parameter_type": 2,
       "parameter_invisible": 2
      }
     },
     "text": "delete",
     "texton": "delete",
     "mode": 0
    }
   },
   {
    "box": {
     "id": "msgdel",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      634.0,
      962.0,
      70.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "dodelete"
    }
   },
   {
    "box": {
     "id": "bLearn",
     "maxclass": "live.text",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      708.0,
      932.0,
      88.0,
      22.0
     ],
     "outlettype": [
      "",
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      396.0,
      128.0,
      88.0,
      22.0
     ],
     "parameter_enable": 1,
     "fontname": "Ableton Sans",
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_enum": [
        "MIDI learn",
        "LEARNING"
       ],
       "parameter_longname": "sndwrks MIDI Learn",
       "parameter_shortname": "learn",
       "parameter_mmax": 1,
       "parameter_type": 2,
       "parameter_invisible": 2
      }
     },
     "text": "MIDI learn",
     "texton": "LEARNING",
     "mode": 1
    }
   },
   {
    "box": {
     "id": "bTransport",
     "maxclass": "live.tab",
     "numinlets": 1,
     "numoutlets": 3,
     "patching_rect": [
      708.0,
      995.0,
      160.0,
      22.0
     ],
     "outlettype": [
      "",
      "",
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      528.0,
      128.0,
      160.0,
      22.0
     ],
     "parameter_enable": 1,
     "fontname": "Ableton Sans",
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_enum": [
        "udp",
        "tcp"
       ],
       "parameter_longname": "sndwrks Transport",
       "parameter_shortname": "transport",
       "parameter_mmax": 1,
       "parameter_type": 2,
       "parameter_invisible": 1
      }
     }
    }
   },
   {
    "box": {
     "id": "prepTransport",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      708.0,
      1030.0,
      150.0,
      22.0
     ],
     "outlettype": [
      ""
     ],
     "text": "prepend settransport"
    }
   },
   {
    "box": {
     "id": "lblHint",
     "maxclass": "comment",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      560.0,
      1030.0,
      240.0,
      18.0
     ],
     "text": "f:1 float   i:2 int   s:1 string",
     "fontsize": 9.0,
     "fontname": "Ableton Sans",
     "textcolor": [
      0.5,
      0.5,
      0.52,
      1.0
     ],
     "presentation": 1,
     "presentation_rect": [
      252.0,
      152.0,
      240.0,
      14.0
     ]
    }
   }
  ],
  "lines": [
   {
    "patchline": {
     "source": [
      "midiin",
      0
     ],
     "destination": [
      "mparse",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "midiin",
      0
     ],
     "destination": [
      "midiout",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "mparse",
      0
     ],
     "destination": [
      "unpack",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "unpack",
      1
     ],
     "destination": [
      "neq",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "neq",
      0
     ],
     "destination": [
      "plus",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "plus",
      0
     ],
     "destination": [
      "gate2",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "unpack",
      0
     ],
     "destination": [
      "gate2",
      1
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "gate2",
      0
     ],
     "destination": [
      "colloff",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "gate2",
      1
     ],
     "destination": [
      "collon",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "colloff",
      0
     ],
     "destination": [
      "rsym",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "collon",
      0
     ],
     "destination": [
      "rsym",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "rsym",
      0
     ],
     "destination": [
      "fsym",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "fsym",
      0
     ],
     "destination": [
      "gateT",
      1
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "rsym",
      1
     ],
     "destination": [
      "gateT",
      1
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "gateT",
      0
     ],
     "destination": [
      "udp",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "gateT",
      1
     ],
     "destination": [
      "node",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "fsym",
      0
     ],
     "destination": [
      "dbg",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "rsym",
      1
     ],
     "destination": [
      "dbg",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tplus",
      0
     ],
     "destination": [
      "gateT",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "unpack",
      0
     ],
     "destination": [
      "learngate",
      1
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "learngate",
      0
     ],
     "destination": [
      "prepsel",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "js",
      0
     ],
     "destination": [
      "fson",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "fson",
      0
     ],
     "destination": [
      "collon",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "js",
      1
     ],
     "destination": [
      "fsoff",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "fsoff",
      0
     ],
     "destination": [
      "colloff",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "pattr",
      1
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "lb",
      0
     ],
     "destination": [
      "msginit",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "thisdev",
      0
     ],
     "destination": [
      "msginit",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "msginit",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "lb",
      0
     ],
     "destination": [
      "msgbangT",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "thisdev",
      0
     ],
     "destination": [
      "msgbangT",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "msgbangT",
      0
     ],
     "destination": [
      "bTransport",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "prepsel",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "grid",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "js",
      2
     ],
     "destination": [
      "grid",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "js",
      3
     ],
     "destination": [
      "teAddr",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "js",
      4
     ],
     "destination": [
      "teArgs",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "js",
      5
     ],
     "destination": [
      "lblNote",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "teAddr",
      0
     ],
     "destination": [
      "prepaddr",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "prepaddr",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "teArgs",
      0
     ],
     "destination": [
      "prepargs",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "prepargs",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tabMode",
      0
     ],
     "destination": [
      "prepmode",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "prepmode",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "bSet",
      0
     ],
     "destination": [
      "tset",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tset",
      2
     ],
     "destination": [
      "teArgs",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tset",
      1
     ],
     "destination": [
      "teAddr",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tset",
      0
     ],
     "destination": [
      "msgset",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "msgset",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "bDel",
      0
     ],
     "destination": [
      "msgdel",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "msgdel",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "bLearn",
      0
     ],
     "destination": [
      "learngate",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "bTransport",
      0
     ],
     "destination": [
      "tplus",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "bTransport",
      0
     ],
     "destination": [
      "prepTransport",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "prepTransport",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "teHost",
      0
     ],
     "destination": [
      "rtHost",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "rtHost",
      0
     ],
     "destination": [
      "prepHost",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "prepHost",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tePort",
      0
     ],
     "destination": [
      "rtPort",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "rtPort",
      0
     ],
     "destination": [
      "prepPort",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "prepPort",
      0
     ],
     "destination": [
      "js",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "js",
      6
     ],
     "destination": [
      "udp",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "js",
      6
     ],
     "destination": [
      "node",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "js",
      7
     ],
     "destination": [
      "teHost",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "js",
      8
     ],
     "destination": [
      "tePort",
      0
     ]
    }
   }
  ]
 }
}