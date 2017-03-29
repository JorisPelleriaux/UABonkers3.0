import { Injectable } from '@angular/core';
import { Score } from './score';
import { Http, Response } from '@angular/http';
import 'rxjs/add/operator/toPromise';

@Injectable()
export class ScoreService {
    private scoreUrl = '/api/score';

    constructor (private http: Http) {}

    // get("/api/score")
    getScore(): Promise<Score[]> {
      return this.http.get(this.scoreUrl)
                 .toPromise()
                 .then(response => response.json() as Score[])
                 .catch(this.handleError);
    }

    // post("/api/score")
    createScore(newScore: Score): Promise<Score> {
      return this.http.post(this.scoreUrl, newScore)
                 .toPromise()
                 .then(response => response.json() as Score)
                 .catch(this.handleError);
    }

    // get("/api/score/:id") endpoint not used by Angular app

    // delete("/api/score/:id")
    deleteScore(delScoreId: String): Promise<String> {
      return this.http.delete(this.scoreUrl + '/' + delScoreId)
                 .toPromise()
                 .then(response => response.json() as String)
                 .catch(this.handleError);
    }

    // put("/api/score/:id")
    updateScore(putScore: Score): Promise<Score> {
      var putUrl = this.scoreUrl + '/' + putScore._id;
      return this.http.put(putUrl, putScore)
                 .toPromise()
                 .then(response => response.json() as Score)
                 .catch(this.handleError);
    }

    private handleError (error: any) {
      let errMsg = (error.message) ? error.message :
      error.status ? `${error.status} - ${error.statusText}` : 'Server error';
      console.error(errMsg); // log to console instead
    }
}