
export default function runWorker (patchConnection)
{
    const valueBank = [
        10.8, 13.8, 14.3, 19.7, 20.8, 27.3, 27.7, 31.32, 31.7, 32, 33, 33.8, 35, 38,
        39, 40, 45, 46.98, 55, 59.9, 62.64, 63, 70, 70.47, 73.6, 80, 83, 90, 98.4,
        105, 108, 110, 111, 120, 126.22, 136.1, 140.25, 141.27, 144.72, 147, 147.85,
        160, 172.06, 174, 183.58, 187.61, 194.18, 194.71, 197, 207.36, 210.42, 211.44,
        221.23, 250, 256, 264, 273, 285, 288, 293, 315, 315.8, 320, 341, 342, 345, 360,
        372, 384, 396, 402, 404, 408, 410, 413, 416, 417, 420.82, 440, 441, 445, 448,
        464, 480, 492.8, 526, 528, 586, 620, 630, 639, 685, 728, 741, 784, 852, 880,
        963, 984, 1000, 1033, 1052, 1074, 1185, 1296, 1417, 1820, 2025, 2041, 2675,
        3240, 3835, 3975, 4049, 4129, 4173, 4221, 4280, 4444, 4671, 4840, 5201, 5284,
        5907, 6051, 8000, 9999, 12000
    ];
    
    const harmonicAmplitudes = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const envelopeMap = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const harmonicRatios = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];


    const valueListStrings = [
        "keyMapping", 
        "harmonicRatios",
        "valueBank",
        "harmonicAmplitudes",
        "envelopeMap"
    ];

    patchConnection.sendEventOrValue("noteFrequenciesIn", valueBank);
    patchConnection.sendEventOrValue("harmonicAmplitudesIn", harmonicAmplitudes);
    patchConnection.sendEventOrValue("harmonicRatiosIn", harmonicRatios);
    patchConnection.sendEventOrValue("valueBankIn", valueBank);
    patchConnection.sendEventOrValue("envelopeMapIn", envelopeMap);

    /*patchConnection.addStoredStateValueListener((data) => {
        if (data.value != null){
            if (data.key === "keyMapping"){
                patchConnection.sendEventOrValue("noteFrequenciesIn", data.value);
            } else {
                patchConnection.sendEventOrValue(`${data.key}In`, data.value);
            }
        } else {
            if (data.key === "keyMapping"){
                patchConnection.sendEventOrValue("noteFrequenciesIn", window.valueBank);
            } else {
                patchConnection.sendEventOrValue(`${data.key}In`, window[data.key]);
            }
        }
    });

    for (const valuesList of valueListStrings){
        patchConnection.requestStoredStateValue(valuesList);
    }*/


}