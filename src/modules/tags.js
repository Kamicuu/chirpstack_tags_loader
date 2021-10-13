const tags = angular.module("tags", ["tags.service"]);

tags.controller("TagsCtrl", ($scope, $timeout, TagsService, $q) => {

    vm = $scope.form = {};
    vm.validateInfo = {};
    vm.ip = "http://localhost:8080"
    vm.status;
    vm.dataWasSend = false;
    vm.displayErrorLog = false;
    vm.errorLogs
    vm.overrideTags = false

    let promise = $timeout();
    

    vm.process = () =>{

        file = document.getElementById('file_xlsx').files[0];
        readFile(file).then( data=>{

            buff = new Uint8Array(data);
            vm.jsonXLSXData = to_json(XLSX.read(buff,{type:'array'}));
            
            //'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhcyIsImV4cCI6MTYzMzczMzEwNywiaWQiOjEsImlzcyI6ImFzIiwibmJmIjoxNjMzNjQ2NzA3LCJzdWIiOiJ1c2VyIiwidXNlcm5hbWUiOiJhZG1pbiJ9.8b3yNzvQ1OQ2LfLfC0ycl6mfnGIA52x77-X13B6fKdA'
            //'http://172.16.1.251:8080'
            vm.validateInfo = TagsService.prepareAndValidateData(vm.jsonXLSXData.Arkusz1, vm.jwt, vm.ip, vm.overrideTags)
            
            $scope.$parent.$apply()

            if(vm.validateInfo.type==='error'){
                throw(vm.validateInfo);
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
            vm.validateInfo = {type: 'error', msg: "Nie udało się wczytać pliku xlsx"}
        }
        
    });
  };


