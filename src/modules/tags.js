const tags = angular.module("tags", ["tags.service"]);

tags.controller("TagsCtrl", ($scope, $timeout, TagsService, $q) => {

    vm = $scope.form = {};
    vm.validateInfo = [];
    vm.validationHasError;
    vm.ip = "http://localhost:8080"
    vm.status;
    vm.dataWasSend = false;
    vm.displayErrorLog = false;
    vm.errorLogs
    vm.updateProperties = {
        overrideTags: false,
        updateTags: false,
        updateDeviceProfile: false
    }

    let promise = $timeout();
    

    vm.process = () =>{
        vm.validateInfo = [];

        file = document.getElementById('file_xlsx').files[0];
        readFile(file).then( data=>{

            buff = new Uint8Array(data);
            vm.jsonXLSXData = to_json(XLSX.read(buff,{type:'array'}));
            
            //vm.jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhcyIsImV4cCI6MTYzNTAxODM0NiwiaWQiOjEsImlzcyI6ImFzIiwibmJmIjoxNjM0OTMxOTQ2LCJzdWIiOiJ1c2VyIiwidXNlcm5hbWUiOiJhZG1pbiJ9.WptQu3XVHi8kSOcr9vz0wyFTqDNWdEjLs7A7xbBfZcQ'
            //vm.ip='http://172.16.1.251:8080'
            vm.validateInfo = TagsService.prepareAndValidateData(vm.jsonXLSXData.Arkusz1, vm.jwt, vm.ip, vm.updateProperties)
            
            $scope.$parent.$apply()

            if(vm.validateInfo.find(ele => ele.type==='error')){
                vm.validationHasError = true
                $scope.$parent.$apply()
                throw(vm.validateInfo);
            }else{
                vm.validationHasError = false
            }
        
        }).then(()=>{

            vm.requests = TagsService.getRequestArray()
            let requestsPromiseArray = []
            vm.dataWasSend = true;

            for(let i=0; i<vm.requests.length; i++){

                promise = promise.then(()=>{
                    requestsPromiseArray.push(TagsService.updateSingleDevice(vm.requests[i]))
                    return $timeout(40);
                }).then(()=>{
                    vm.status = TagsService.getStatistics(); 
                });

            }
        })

    }

    vm.showErrorLog = ()=>{
        vm.displayErrorLog = true;
        vm.errorLogs = TagsService.getErrorLogs();
    }

    
});


const to_json = (workbook) => {
    var result = {};
    workbook.SheetNames.forEach(function(sheetName) {
        var roa = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1});
        if(roa.length) result[sheetName] = roa;
    });
    return result;
};



const readFile = (inputFile) => {
    const fileReader = new FileReader();
  
    return new Promise((resolve, reject) => {
        fileReader.onerror = () => {
            fileReader.abort();
            reject(new DOMException("Problem parsing input file."));
        };
  
        fileReader.onload = () => {
            resolve(fileReader.result);
        };

        try{
            fileReader.readAsArrayBuffer(inputFile);
        }catch(error){
            vm.validationHasError = true
            vm.validateInfo.push({type: 'error', msg: "Nie udało się wczytać pliku xlsx"})
        }
        
    });
  };


