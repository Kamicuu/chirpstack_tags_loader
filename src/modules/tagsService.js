const serv = angular.module("tags.service", [])

serv.service("TagsService", function ($rootScope, $http) {

    
    this._requestArray = [];
    this._requestsNumbers = {
        success: 0,
        error: 0,
        total: 0,
    }
    this._errorList = [];
    this._overrideTags

    this.prepareAndValidateData = (dataJsonXls, jwt, lnsIp, overrideTags) =>{

        this._requestArray = [];
        this._requestsNumbers = {
            success: 0,
            error: 0,
            total: 0,
        }
        this._errorList = [];
        this._header = dataJsonXls[0];
        this._overrideTags = overrideTags;
    
        const hexRegex = new RegExp(/\b[a-f0-9]+\b/i) 

        if(lnsIp===undefined || jwt===undefined || lnsIp==='' || jwt===''){
            return {type: 'error', msg:'Upewnij się że pola w formularzu są wypełnione'}
        }


        if(this._header[0]!=="devEui"){
            return {type: 'error', msg:'Pierwsze pole formularza musi mieć tytuł "devEui"'}
        }


        for (let i = 1; i < dataJsonXls.length; ++i) {
            
            let data = dataJsonXls[i]
            let tagsObject = {}

            data[0] = data[0].slice(2)


            if(data[0].length != 16 ){
                return {type: 'error', msg:'Długość devEui w wierszu: '+(i+1)+' nie zgadza się! Upewnij sie ze devEui jest w formacie 0xFFFFFFFFFFFFFFFF'}
            }else if(!hexRegex.test(data[0])){  
                return {type: 'error', msg:'devEui w wierszu: '+(i+1)+ ' posiada niedozwolne znaki (dozwolone są znaki w notacji hex)'}
            }



            try {
                //Add multiple tags (one tag - one column) j=1 cause devEui first col
                for(let j = 1; j<this._header.length; j++){
                    tagsObject[this._header[j]] = data[j].toString()
                }

                let requestDataObj =   {
                    devEui: data[0].toString(),
                    jwt: jwt,
                    lnsIp: lnsIp,
                    data:{
                        device: {
                            tags: tagsObject
                        }
                    }    
                }

                this._requestArray.push(requestDataObj)
              } catch (error) {
                return {type: 'error', msg:'Nie udało się przeprocesować danych, błąd w wierszu: '+(i+1)}
              }    

        }
      
        return {type: 'info', msg:'OK'}

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

            if(!this._overrideTags){
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

  });
