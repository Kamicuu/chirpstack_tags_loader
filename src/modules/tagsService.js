const serv = angular.module("tags.service", [])

serv.service("TagsService", function ($rootScope, $http) {

    
    this._requestArray = [];
    this._requestsNumbers = {
        success: 0,
        error: 0,
        total: 0,
    }
    this._errorList = [];
    this._updateProperties = {}

    this.prepareAndValidateData = (dataJsonXls, jwt, lnsIp, updateProperties) =>{

        this._requestArray = [];
        this._requestsNumbers = {
            success: 0,
            error: 0,
            total: 0,
        }
        this._errorList = [];
        this._header = dataJsonXls[0];
        this._updateProperties = updateProperties;
        this._dataJsonXls = dataJsonXls;
        this._jwt = jwt;
        this._lnsIp = lnsIp;

        let validation = []
        
        const idRegex = new RegExp (/\b[a-z-0-9]+\b/)

        if(lnsIp===undefined || this._jwt===undefined || this._lnsIp==='' || this._jwt===''){
            validation.push({type: 'error', msg:'Upewnij się że pola w formularzu są wypełnione'})
            return validation
        }


        if(this._header[0]!=="devEui"){
            validation.push({type: 'error', msg:'Pierwsze pole formularza musi mieć tytuł "devEui"'})
            return validation
        }else if(this._header[1]!=="deviceProfileId"){
            validation.push({type: 'error', msg:'Drugie pole formularza musi mieć tytuł "deviceProfileId"'})
            return validation
        }

        
        validation.push(this._prepareSkeleton()) 

        //if skeleton wrong - stop program
        if(validation[0].type==='error'){
            return validation
        }


        if(this._updateProperties.updateTags){
            validation.push(this._validateTags())
        }
        if(this._updateProperties.updateDeviceProfile){
            validation.push(this._validateDeviceProfile())
        }

        return validation;

    }

    this.updateSingleDevice= (requestData) =>{

        this._requestsNumbers.total++;

        return $http({
            url: requestData.lnsIp+'/api/devices/'+requestData.devEui,
            method: 'GET',
            headers: {
                'Grpc-Metadata-Authorization': 'Bearer '+requestData.jwt, 
                'Content-Type': 'application/json'
            },
        
        })
        .then(response => {

            let tmp = {device: {...response.data.device, ...requestData.data.device}}

            if(!this._updateProperties.overrideTags){
                tmp.device.tags = {...response.data.device.tags, ...requestData.data.device.tags}
            }
            
            
            $http({
                url: requestData.lnsIp+'/api/devices/'+requestData.devEui,
                method: 'PUT',
                headers: {
                'Grpc-Metadata-Authorization': 'Bearer '+requestData.jwt, 
                'Content-Type': 'application/json'
                },
                data: JSON.stringify(tmp) 
            }).then(() =>{
                this._requestsNumbers.success++;
            }, onError =>{
                this._requestsNumbers.error++;
                this._errorList.push({device: requestData.devEui, msg:onError.data.error, reqType: 'PUT'})
            })
            
        }, onError =>{
            this._requestsNumbers.error++;
            this._errorList.push({device: requestData.devEui, msg:onError.data.error, reqType: 'GET'})
        })
          
    }

    this.getRequestArray = () =>{
        return this._requestArray
    }

    this.getStatistics = () =>{
        return this._requestsNumbers;
    }

    this.getErrorLogs = () =>{
        return this._errorList;
    }

    // internal functions
    this._prepareSkeleton = () => {

        const hexRegex = new RegExp(/\b[a-f0-9]+\b/i) 

        for (let i = 1; i < this._dataJsonXls.length; ++i) {
            
            let data = this._dataJsonXls[i]

            data[0] = data[0].slice(2)


            if(data[0].length != 16 ){
                return {type: 'error', msg:'Długość devEui w wierszu: '+(i+1)+' nie zgadza się! Upewnij sie ze devEui jest w formacie 0xFFFFFFFFFFFFFFFF'}
            }else if(!hexRegex.test(data[0])){  
                return {type: 'error', msg:'devEui w wierszu: '+(i+1)+ ' posiada niedozwolne znaki (dozwolone są znaki w notacji hex)'}
            }

            try {

                let requestDataObj =   {
                    devEui: data[0].toString(),
                    jwt: this._jwt,
                    lnsIp: this._lnsIp,
                    data:{
                        device: {}
                    }    
                }

                this._requestArray.push(requestDataObj)
              } catch (error) {
                return {type: 'error', msg:'Nie udało się przeprocesować devEui, błąd w wierszu: '+(i+1)}
              }    

        }

        return {type: 'info', msg:'Walidacja devEui przebiegła pomyślnie'}


    }

    this._validateTags = () =>{
        
        for(let i=1; i<this._dataJsonXls.length; i++){

            let data = this._dataJsonXls[i]
            let tagsObject = {}

            try {
                //Add multiple tags (one tag - one column) j=2 cause devEui first col and deviceProfile second
                for(let j = 2; j<this._header.length; j++){
                    tagsObject[this._header[j]] = data[j].toString()
                }
            } catch (error) {
                return {type: 'error', msg:'Nie udało się przeprocesować tagów, błąd w wierszu: '+(i+1)}
            }    

            this._requestArray[i-1].data.device.tags = tagsObject

        }

        return {type: 'info', msg:'Walidacja tagów przebiegła pomyślnie'}

    }

    this._validateDeviceProfile = () =>{

        const idRegex = new RegExp(/\b[a-z-0-9]+\b/) 

      
        for(let i=1; i<this._dataJsonXls.length; i++){


            let data = this._dataJsonXls[i][1]

            try {

                if(data.length != 36){
                    return {type: 'error', msg:'Długość deviceProfileId w wierszu: '+(i+1)+' nie zgadza się! Upewnij sie ze deviceProfileId jest w formacie ffffffff-ffff-ffff-ffff-ffffffffffff'}
                }else if(!idRegex.test(data)){
                    return {type: 'error', msg:'deviceProfileId w wierszu: '+(i+1)+ ' posiada niedozwolne znaki (dozwolone są znaki a-z, 0-9 oraz -)'}
                }

                this._requestArray[i-1].data.device.deviceProfileID = data
            }
            catch (error) {
                return {type: 'error', msg:'Nie udało się przeprocesować deviceProfileId, błąd w wierszu: '+(i+1)}
            }   

        }

        return {type: 'info', msg:'Walidacja deviceProfile przebiegła pomyślnie'}
  
    }

  });
